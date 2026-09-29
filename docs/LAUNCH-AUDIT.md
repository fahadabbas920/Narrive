# Narrive — Launch readiness audit

**Date:** 2026-09-29 · **State audited:** commit `5d41988` (production DB at `a4c9e2f7b1d3`)

What's left before Narrive goes to market, from the owner's point of view. The findings come from reading the code and the production environment variable names; nothing was load-tested or pen-tested.

The password reset, email verification and session work is planned separately in [AUTH-PLAN.md](plans/AUTH-PLAN.md).

---

## 1. Short answers

| Question | Answer |
|---|---|
| Do I need a domain? | **Yes, and get it first.** Email providers only send from a domain you own and have verified, so every email feature waits on it. It also makes the product look real. |
| Is Resend a good choice? | **Yes.** It has a simple Python SDK, a free tier of about 3,000 emails a month (100 a day), and setup is a few DNS records. Postmark is the main alternative and is also good, but switching isn't worth it. |
| Can I skip email and still ship password reset? | **No.** A reset needs a channel that proves who the person is, and for Narrive that channel is email. Decided: a verified email is required before reading a story, and account emails can never be changed (see AUTH-PLAN.md). |
| Do I need test users? | **Yes.** Run a closed beta of 15–30 people for about 2 weeks before the public launch (section 4). |
| Is security good enough? | **Not yet.** There are three serious gaps (rate limiting, password rules, tokens that can't be cancelled), listed in section 2. |

---

## 2. Security audit

### Findings

| # | Severity | Finding | Risk | Fix |
|---|---|---|---|---|
| 1 | **High** | **No rate limiting anywhere.** `/auth/signin` and `/auth/signup` accept unlimited attempts. | Password guessing, credential stuffing and scripted spam sign-ups. | Limit the auth routes by IP and by email. An in-memory limiter won't work on Vercel, because each request can hit a different serverless instance. Use a small Postgres table, Upstash Redis, or Vercel Firewall rate-limit rules. |
| 2 | **High** | **No password rules.** `UserCreate.password` is a bare `str`, and the register form doesn't check it either. `"a"` is a valid password today. | Accounts that are trivial to take over. | At least 8 characters, capped at 72 bytes (bcrypt ignores anything beyond that), checked in both the API schema and the form. |
| 3 | **High** | **Tokens can't be cancelled.** A JWT is valid for 30 days, and the server has no way to end one early. | A stolen token keeps working for up to 30 days, even after a password change. That makes a password reset flow pointless. | Add `users.token_version`, put it in the token, and check it in `get_current_user`. Increasing it signs the account out everywhere. (Part of AUTH-PLAN.md.) |
| 4 | Medium | **The token lives in `localStorage`**, plus a cookie that JavaScript can read. `next.config.ts` sets **no security headers**. | Any XSS bug would expose every session. I found no `dangerouslySetInnerHTML`, and React escapes story text, so today's risk is low. | Add a Content-Security-Policy, HSTS, `frame-ancestors 'none'` / `X-Frame-Options`, `Referrer-Policy` and `X-Content-Type-Options`. Moving to httpOnly cookies can wait until after launch. |
| 5 | Medium | **No length limits on story or scene text** (`title`, `description`, scene `content`, choice `text`). | Database bloat and abuse. Vercel's 4.5 MB request cap is the only limit today. | Add `max_length` to each of these fields, for example 50,000 characters per scene. |
| 6 | Medium | **Emails probably aren't lowercased at signup** (not yet tested). `Foo@x.com` and `foo@x.com` could become two accounts. | Duplicate accounts, and password reset emails going to the wrong account. | Lowercase and trim emails in `UserCreate`, and run a one-off migration that normalizes existing rows (after checking for collisions). |
| 7 | Low | **`/docs` and `/redoc` are public in production.** | They publish a full map of the API. | Turn them off unless running in development. |
| 8 | Low | **`python-jose` is barely maintained** and has had security issues. | Future security fixes may never arrive. | Switch to `PyJWT`. The change is small and contained to `app/core/security.py`. |
| 9 | Low | **Signup reveals existing accounts** ("Email already registered"). | Anyone can test whether an email has an account. That's common and acceptable on signup. | Keep it on signup, but the reset flow must never do this (AUTH-PLAN.md). |
| 10 | Low | **The database schema is created on every cold start** (`create_all` in `main.py`). | It's harmless now, but it can drift from Alembic and slows cold starts. | Rely on Alembic only in production. |

### Already fine

- Passwords are hashed with bcrypt.
- `SECRET_KEY` and `BACKEND_CORS_ORIGINS` are set in Vercel production.
- CORS allows only the production frontend.
- The API re-checks writer and admin rights against the database on every request; token claims are routing hints only.
- `get_current_user` rejects suspended accounts, so suspending takes effect immediately.
- The super admin role can only be granted from the command line.
- Profile links only accept http(s) URLs, so `javascript:` links are blocked.
- Endings and reading stats can't be faked by editing requests (`_run_is_real`).
- The "next" URL after sign-in is guarded against open redirects (`safeNext`).

---

## 3. Business and operations gaps

### Hosting and cost

- **The Vercel Hobby plan doesn't allow commercial use** under Vercel's terms. A real launch needs **Pro** (about $20 per member per month). Pro also gives better function limits and Firewall rules.
- **Neon:**
  - check the plan's compute limits, cold-start behaviour and **how far back backups can restore** (point-in-time restore window);
  - do one practice restore to a branch before launch.
- **Domain:**
  - point it at the `narrive` project; the API can live at `api.<domain>`;
  - update `BACKEND_CORS_ORIGINS` and `NEXT_PUBLIC_API_URL`, then redeploy both projects.

### Legal and trust

- **Terms of Service and Privacy Policy pages don't exist.** The become-a-writer step asks writers to accept terms, but there's nothing to link to. Both pages need a link from the sign-up screen and the footer.
- **Account deletion:** users can't delete their account. That's required under GDPR if you have EU users, and expected anyway. Decide what happens to a deleted writer's published stories.
- **Age rule:** set a minimum age (13+ is typical, because of COPPA) and state it at sign-up.
- **Content ownership:** the Terms should say that writers keep the rights to their work and grant Narrive a licence to display it.

### Moderation

- **Anyone can publish fiction, and readers can't report anything.** Add a "Report story" action. Reports should appear in the admin console; unpublish and archive already exist there.
- Content ratings are chosen by writers themselves. Decide whether mature stories need a gate, such as a signed-in, age-confirmed reader.

### Monitoring

- **No error tracking.** Add Sentry (the free tier is enough) to the API and the web app.
- **No uptime alerting.** Ping `/health` with a free monitor, such as Better Stack or UptimeRobot.
- **No product analytics.** Vercel Analytics or Plausible would show sign-ups, reads and publishes. Admin stats already cover reading.

### Content

- **An empty shelf kills a launch.** Seed 10–20 Narrive Originals through the bulk importer (`/admin/import`) and feature the best 6, so the first readers find something to read.

---

## 4. Closed beta

| | |
|---|---|
| **Who** | 15–30 people, about a third of them writers. Include a few who aren't technical. |
| **How long** | About 2 weeks. |
| **Where** | Production, on the real domain, with a "Send feedback" link in the footer (a form or an email address). |
| **Before inviting** | Section 2 findings 1–3, the password reset flow and Sentry must be live, so beta testers can't get locked out and you can see errors. |

**What to watch:**

1. **Writers:** can a writer go from sign-up to a published story without help? Where do they stall in the editor?
2. **Readers:** do readers finish stories? Do they come back through My reading?
3. **Support:** which questions come up that [FLOWS.md](FLOWS.md) doesn't already answer? Those become support docs.
4. **Errors:** which errors show up in Sentry?

**Staging (optional):** preview deploys can't call the API today, because CORS only allows the production URL. To get a staging environment:

- give it a Neon branch;
- add its URL to `BACKEND_CORS_ORIGINS` on the preview environment.

---

## 5. Launch order

1. **Domain:** buy it, connect it to Vercel, and add Resend's DNS records.
2. **Security fixes:** section 2, findings 1–3 (rate limiting, password rules, `token_version`), plus 6 (lowercase emails).
3. **Auth flows:** forgot password, change password, and email verification required for reading, as planned in [AUTH-PLAN.md](plans/AUTH-PLAN.md).
4. **Hardening:** security headers, text length limits, `/docs` turned off, PyJWT (findings 4, 5, 7, 8).
5. **Trust:** Terms and Privacy pages, account deletion, the report button, and an age rule at sign-up.
6. **Ops:** upgrade to Vercel Pro, add Sentry and an uptime monitor, and do a practice backup restore.
7. **Content:** seed and feature the Originals.
8. **Beta:** run it for about 2 weeks and fix what it finds.
9. **Public launch.**
