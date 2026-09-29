# Narrive — Auth plan: password reset, email verification and sessions

**Status:** planned, next to build · **Date:** 2026-09-29

The background and the rest of the launch list are in [LAUNCH-AUDIT.md](../LAUNCH-AUDIT.md). This document covers only the auth work.

## Goals

1. **Forgot password:** from the login screen, a user who forgot their password gets back in with a 6-digit code sent by email.
2. **Change password:** from account settings, a signed-in user changes their password, with an option to sign out of other devices.
3. **Email verification (required to read):**
   - anyone, signed in or not, can browse the catalogue, story pages and writer profiles;
   - **opening a story to read it** needs a verified email, and so does becoming a writer;
   - right after sign-up, the user goes through a verify step before anything else.
4. **Sessions can be revoked:** a password reset or change actually cancels stolen tokens.
5. **Brute-force protection:** rate limits on every auth route.

**Out of scope:** social login, two-factor authentication, magic-link sign-in, and httpOnly cookie sessions.

**Never built:** changing an account's email address. The email a user signs up with is permanent (see the decisions below).

## Prerequisites

- [ ] Domain bought and connected to Vercel.
- [ ] Resend account, with the domain verified (SPF, DKIM, and a DMARC record at `p=none` to start). Send from `no-reply@<domain>`.
- [ ] `RESEND_API_KEY` and `EMAIL_FROM` added to the `narrive-api` production environment.
- [ ] `APP_URL` (the frontend URL) added to the `narrive-api` environment, for links in emails.

Locally, if `RESEND_API_KEY` is empty, the API **logs the code to the console instead of sending an email**. That keeps development and tests free of email.

---

## Design decisions

| Decision | Choice | Why |
|---|---|---|
| Codes or links? | **6-digit codes** | They work when the email is opened on another device, can't be triggered by link scanners, and use the same screen for reset and verification. |
| How are codes stored? | **A hash only** (SHA-256 with a server secret, i.e. HMAC) | A database leak doesn't expose working codes. |
| How long do codes last? | **10 minutes**, with **5 wrong tries** allowed, and each new code cancels older ones | Six digits plus 5 tries gives an attacker a 1 in 200,000 chance per code. |
| Re-send | **At most one a minute**, and 5 an hour per email | Prevents inbox flooding and keeps email costs down. |
| Account enumeration | **Forgot password always replies the same way:** "If an account exists for that email, we've sent a code." | The reset form mustn't reveal who has an account. |
| After a reset | Increase `token_version` (**signs out everywhere**), then sign the user in on the current device | A reset exists to lock out someone else. |
| Verification gate | **Hard for reading:** browsing is open to everyone; reading a story, saving reading progress and becoming a writer all need a verified email | Owner decision: only verified people read. Every reader is a real, reachable inbox, which also keeps reading stats clean. |
| Verify banner | **Can't be dismissed.** It disappears only once the email is verified | Owner decision: the reminder stays until the job is done. |
| Changing email | **Not possible, ever.** No endpoint, no settings field; admins can't change it either | Owner decision. The email is the account's identity and its recovery channel, so no one who takes over a session can move the account to another inbox. |
| Existing users | Accounts created before launch are marked verified by the migration | Current accounts are testers and admins; no one gets locked out. |

---

## Backend

### Data model (one Alembic migration)

**Changes to `users`:**

```
email_verified_at   timestamptz  null        # set to now() for all existing rows in the migration
token_version       integer      not null default 0
password_changed_at timestamptz  null
```

**New table `email_codes`** (`app/models/auth.py`):

```
id           uuid pk
user_id      uuid → users.id (cascade)
purpose      text  "reset_password" | "verify_email"
code_hash    text
expires_at   timestamptz
attempts     integer default 0
used_at      timestamptz null
created_at   timestamptz
index (user_id, purpose, created_at desc)
```

**New table `auth_attempts`** (the rate-limit log; works on serverless):

```
id          bigserial pk
key         text          # e.g. "signin:ip:1.2.3.4", "signin:email:a@b.com", "reset:email:…"
created_at  timestamptz
index (key, created_at)
```

Rows older than 24 hours are deleted as a side effect of each insert (1% of the time), so the table stays small without a cron job.

### Token changes (`app/core/security.py`, `app/core/deps.py`)

- `token_for(user)` adds a `"ver": user.token_version` claim.
- `get_current_user` rejects the token when `payload["ver"] != user.token_version`.
  - Old tokens without `ver` count as version 0, so no one is signed out on deploy.
  - This means `get_current_user_id` returns the whole payload (or the version as well), not just `sub`.
- Replace `python-jose` with `PyJWT` in the same change. Only encode and decode are affected.

### Password rules (`app/schemas/auth.py`)

- A new `NewPassword` type: at least 8 characters and at most 72 bytes in UTF-8. Error messages:
  - "Password must be at least 8 characters";
  - "Password is too long".
- Used by signup, reset and change. **Sign-in keeps accepting any string**, so existing short passwords still work until the user changes them.
- Emails are lowercased and trimmed in `UserCreate` and in every new schema that takes an email. A migration normalizes existing emails, and stops if two rows would collide.

### Rate limits (`app/core/rate_limit.py`)

`check_rate(db, key, limit, window)` counts rows in `auth_attempts`, raises **429** "Too many attempts. Try again in a few minutes." when the limit is reached, and otherwise records the attempt.

| Route | Limits |
|---|---|
| `POST /auth/signin` | 10 per 15 minutes per IP, and 5 per 15 minutes per email |
| `POST /auth/signup` | 5 per hour per IP |
| `POST /auth/password/forgot` | 5 per hour per email, and 20 per hour per IP |
| `POST /auth/password/reset` | 10 per 15 minutes per IP (each code also allows only 5 tries) |
| `POST /auth/email/send-code` | 1 per minute and 5 per hour per user |

The IP comes from `x-forwarded-for`, taking the first entry, which Vercel sets.

### Email (`app/core/email.py`)

- `send_email(to, subject, html, text)` calls the Resend SDK, or logs the message when no key is set.
- Two templates, each with a plain-text version and no tracking pixels:
  - "Your Narrive password reset code: 123456"
  - "Confirm your email for Narrive: 123456"
- Each email says the code expires in 10 minutes and that the recipient can ignore the email if they didn't ask for it.
- Sending must never fail the request in a way that reveals whether the account exists. Resend errors are logged, and forgot password still returns 200.

### Endpoints (`app/routers/auth.py`)

```
POST /auth/password/forgot    {email}
  → 200 always. If the account exists, is active and isn't a system account: cancel old
    reset codes, create one and email it.

POST /auth/password/reset     {email, code, new_password}
  → Check the newest unused, unexpired reset code for that user.
    Wrong code: attempts += 1; at 5 the code is dead. 400 "That code is wrong or has expired."
    (The same message for an unknown email, so nothing is revealed.)
    Right code: mark it used, set the new hash, token_version += 1, set password_changed_at,
    and set email_verified_at if it's empty (they proved they own the inbox).
  → 200 {access_token, token_type} (signed in on this device only)

POST /auth/password/change    (signed in) {current_password, new_password, sign_out_others: bool}
  → 400 "Current password is incorrect" if it doesn't match.
    Set the new hash and password_changed_at. If sign_out_others: token_version += 1.
  → 200 {access_token} (a fresh token, so this device stays signed in)

POST /auth/sessions/revoke    (signed in) → token_version += 1; 200 {access_token}
  → "Sign out of all other devices"

POST /auth/email/send-code    (signed in) → 204. Does nothing if already verified.
POST /auth/email/verify       (signed in) {code} → 200 UserRead with email_verified_at set
```

- `UserRead` gains `email_verified: bool`, and the token gains an `email_verified` claim. The claim is a routing hint only, like `is_writer`.
- A new dependency `get_verified_user` (in `app/core/deps.py`) wraps `get_current_user` and returns **403 "Verify your email to keep reading"** when `email_verified_at` is null. It's used by:
  - `PUT / GET / DELETE /me/reading/{story_id}`, which is what makes the gate real, because the reading page can't save or resume without it;
  - `POST /users/me/become-writer`;
  - every writer route: `get_current_writer_id` and `get_current_editor` build on `get_verified_user`, so all of `/stories/*` returns 403 "Verify your email to use the writing desk" until verified. Admins are covered too, because the migration marks existing accounts verified and `create_user` / `make_admin` set `email_verified_at` when they create or promote an account.
- Still open to unverified users: `/auth/me`, the email code endpoints, `/me/library`, `/me/saved` (Read later) and every `/public` route. Saving a story for later isn't reading it. **Say if Read later should be blocked too.**
- `GET /public/stories/{id}` returns every scene, so an unverified user could still read a story through the API directly. The gate stops normal readers, not someone scripting the API. If that matters later, the public story page should stop returning scene content, and the reading page should load it from a verified-only endpoint.
- `UserCreate` and `UserUpdate` never accept an email change; there's no endpoint for one, by design.

---

## Frontend

### New and changed screens

| Where | What |
|---|---|
| `/login` | A **"Forgot password?"** link under the password field, which goes to `/forgot-password?email=…` |
| `/forgot-password` (new, in `(auth)`) | **Step 1:** enter your email, then see "Check your inbox". **Step 2:** enter the 6-digit code and a new password (with a strength hint and the 8-character minimum), then you're signed in and sent to where login would have taken you. Step 2 has a "Resend code" button with a 60-second countdown. |
| `/register` | The 8-character minimum is shown and checked before submitting. After sign-up, the verification code is sent automatically and the user goes to `/verify-email?next=…`, not straight to `next`. |
| `/verify-email` (new, needs a session) | "We sent a code to you@example.com". Code input, "Resend code" with a 60-second countdown, and a "Wrong email? Create a new account" link that signs out (the email can't be changed). On success it goes to `next`, or `/`. |
| `/story/[id]/read` | For an unverified user, it shows a "Verify your email to start reading" card with the code input, instead of the story. Once verified, the story opens in place. |
| `/account` (new, needs a session, for every mode) | **Email:** shown read-only, with verified status and a verify button if needed. There's no edit control. **Password:** current password, new password, and a "Sign out of other devices" checkbox. **Sessions:** a "Sign out everywhere" button. Linked from the account menu as "Account settings". |
| Reader and writer headers | A thin **"Verify your email to start reading"** banner for unverified users, with a link to `/verify-email`. It **has no close button**, and it disappears only once they verify. |
| `/become-a-writer` | **Verification is a step in the onboarding**: Welcome → What you get → **Verify email** → Profile → Confirm. The step only appears for unverified accounts. A reader who is already verified and switches to writing sees the usual 4 steps with nothing extra, and the step counter adjusts. |
| `/register?mode=writer` | Signs up, sends the code automatically, then goes to `/become-a-writer`. The Verify step is already current there, so the writer never sees a separate verify page. |
| `/write/*` (writer dashboard) | `WriterGate` checks `useMe().email_verified`. An unverified account is sent to `/become-a-writer`, which opens at the Verify step. In practice this only catches edge cases, because nobody can become a writer without verifying. |
| Story cards and story pages | "Start reading" stays visible to unverified users and leads to the verify card, so they can see what they're verifying for. |

**Pieces:**

- a shared `CodeInput` component: 6 boxes, paste support, autofill hint `autocomplete="one-time-code"`, and numeric-only input;
- `lib/api/auth.ts` gains `forgotPassword`, `resetPassword`, `changePassword`, `revokeSessions`, `sendVerifyCode` and `verifyEmail`;
- `hooks/use-auth.ts` gains the matching mutations;
- a successful `verifyEmail` invalidates `["me"]`.

**Session handling:**

- Every endpoint that returns a fresh token calls `setSession(token)`, so this device stays signed in after `token_version` changes.
- Other devices get a 401 on their next request, and the existing 401 handler signs them out.

**Routing:**

- Add `/account` and `/verify-email` to the `proxy.ts` matcher and to the `PROTECTED` regex in `app/providers.tsx`.
- The reading page checks `useMe().email_verified`, which is the live value, not the claim. The claim only lets `proxy.ts` send an unverified token from `/story/:id/read` to `/verify-email?next=…` early.
- `/forgot-password` goes in the auth pages list, so signed-in users are bounced off it like `/login`.

---

## Security checklist for review

- [ ] Forgot password gives the same response and similar response time whether or not the account exists (send the email in the background, or accept a small timing difference).
- [ ] Codes are compared in constant time (`hmac.compare_digest`) on the hash.
- [ ] A code can be used once, and only for its purpose (a verify code can't reset a password).
- [ ] Requesting a new code cancels the previous ones.
- [ ] A reset or "sign out everywhere" makes old tokens return 401 on the next request.
- [ ] System accounts (`is_system`) can't request or use reset codes.
- [ ] Suspended accounts can't reset their way back in: the reset succeeds, but sign-in still returns 403.
- [ ] Codes never appear in API responses or production logs.
- [ ] Rate limits return 429 with a friendly message the frontend shows.
- [ ] Every `/me/reading` route returns 403 for an unverified user, whatever the frontend does.
- [ ] Every `/stories` route and `POST /users/me/become-writer` return 403 for an unverified user.
- [ ] No endpoint anywhere writes `users.email` after sign-up.

## Testing (static checks plus a local script)

- `ruff check`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`.
- A local-database script, like the earlier reading-progress checks, that covers:
  - reset with the right code, a wrong code, an expired code and a re-used code;
  - the 6th attempt being refused;
  - an old token being rejected after the reset;
  - change password with and without signing out others;
  - becoming a writer, the `/stories` routes and saving reading progress all blocked when unverified;
  - a verified reader becoming a writer with no extra step;
  - the rate-limit 429.
- The code comes from the console log, because `RESEND_API_KEY` is empty locally.

## Rollout

1. Merge the migration and the backend, with `ver` optional and existing users marked verified. Deploying this changes nothing for current users.
2. Run `alembic upgrade head` on Neon **before** pushing.
3. Ship the frontend screens.
4. Send one real reset email to yourself in production, and check that it doesn't land in spam. If it does, fix the DNS records.
5. Update [FLOWS.md](../FLOWS.md) (accounts section, limits table, support answers for "I forgot my password" and "I didn't get the code") and [CLAUDE.md](../../CLAUDE.md) (data model, endpoints, auth notes).

## Decisions (owner, 2026-09-29)

1. **Unverified users can't read stories.** They can browse everything public, but opening a story needs a verified email.
2. **The account email can never be changed**, by the user or by an admin.
3. **The verify banner can't be dismissed.** It goes away only after verification.
4. **Writers need a verified email too.** The writing desk (`/write/*` and every `/stories` API route) is blocked until verified. New writers verify inside the become-a-writer onboarding. A reader who already verified switches to writing seamlessly, with no extra step.

**Still to confirm:** whether unverified users can use Read later. The plan allows it, because saving isn't reading.

**Worth knowing:** a hard gate means some people will sign up and never verify, because the email lands in spam or they give up. Checking Resend deliverability in production (rollout step 4) matters more with this gate. It's also worth watching the "signed up but never verified" count in the admin overview.
