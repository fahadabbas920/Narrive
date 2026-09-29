# Narrive — Product Flows

What each kind of user can do, step by step, and the rules behind each step. This is the source for support docs and help articles. CLAUDE.md covers the code; this file covers behaviour.

**Keep it current:** when a flow, rule, limit or message changes, update this file in the same change.

---

## 1. Who uses Narrive

| Role | Who | Where they work |
|---|---|---|
| **Visitor** | Not signed in | Browse the catalogue, story pages and writer profiles |
| **Reader** | Any signed-in account | Everything a visitor can do, plus reading, saved progress, Read later, My reading |
| **Writer** | A reader who finished "Become a writer" | Reader mode plus the writing desk (`/write`) |
| **Super admin** | Granted from the command line only | The admin console (`/admin`); can also be a writer |

One account covers everything. Writing is switched on per account; it's not a separate sign-up.

**Modes.** The address decides the mode. `/write/*` is the writing desk, `/admin/*` is the admin console, and everything else is reading. Moving between modes by any link (header switch, account menu, sidebar, "Open your writing desk") shows a short full-screen loading screen:
- reading: peach;
- writing: lavender;
- admin: butter.

Clicks on other mode links are ignored while it plays.

---

## 2. Accounts and sessions

### Sign up
1. Open **Register**, from the header or a prompt (for example, saving a story while signed out). A Reader | Writer toggle sets what happens next.
2. Enter an email and a password. The account signs in right away.
3. Where you land:
   - **Reader** mode goes back to the page you came from, or the catalogue.
   - **Writer** mode goes straight into Become a writer, at the profile step.

| Message | When |
|---|---|
| "Email already registered" | That email already has an account. |

### Sign in
1. Enter your email and password.
2. Where you land:
   - **super admins** always go to the admin console, wherever they started;
   - **everyone else** returns to the page that sent them to sign in; otherwise writer mode opens the writing desk (or Become a writer) and reader mode opens the catalogue.

| Message | When |
|---|---|
| "Invalid email or password" | Wrong details. The message doesn't say which one, on purpose. |
| "This account has been suspended" | An admin suspended the account. |

The house account (`@narrive`) can never sign in.

### Staying signed in and signing out
- A session lasts **30 days** on that browser.
- Signing out, in any tab, signs you out of every tab. Your cached reading data is cleared from the screen at the same moment, so the next person on that computer can't see it.
- If a session expires:
  - on a page that needs an account (reading a story, My reading, the writing desk, the admin console), you see "Session expired. Please sign in again." and go to sign-in, then return where you were;
  - on public pages, you're quietly signed out and keep browsing.

### Not built yet
- **Password reset:** there's no "Forgot password" yet. An admin can set a new password from the command line (`create_user email --reset-password`).
- Changing your email and deleting your account from the app are also not built.

---

## 3. Reader flows

### Browse the catalogue (`/`)
- **Featured** row: up to 6 stories picked by admins. It's hidden while searching or filtering.
- **All stories:** newest first, **12 at a time**, with **Load more** at the bottom. The footer says "Showing X of Y", then "You've seen all N stories".
- **Search** looks at titles, descriptions, pen names and handles, and runs as you type after a short pause. **Genre, mood and rating** filters show how many stories match each option. Changing a search or filter starts the list again from the top.
- **Each card shows:**
  - the title, writer and genres;
  - an **Original** badge on Narrive's own stories;
  - once signed in, your **status** (In progress, Reading again, Finished, All endings), an **endings meter** once you've finished, and a **bookmark** for Read later.
- **Which stories appear:** only published stories whose writer is active and still a writer. Suspending a writer, or removing their writer access, hides their stories at once. It doesn't delete them.

### Story page (`/story/:id`)
- The page shows the description, genres, moods, themes, content rating, number of scenes, the writer's byline (it links to their profile) and publish date.
- **The main button changes with your progress:**

| Your state | Button | What it does |
|---|---|---|
| Not started (or signed out) | **Start reading** | Opens the reader at the start (signed-out visitors go to sign-in first). |
| Mid-story | **Continue reading** | Resumes where you left off. |
| Finished | **Read again** | Starts a new run from the beginning. |

- **Read later:** a **Save for later / Saved** toggle.
- **Your progress box**, once started: scenes explored (for example 7 of 12), endings found (2 of 4), and when you last read it.

### Reading a story (`/story/:id/read`)
You need to be signed in.
- **Moving through the story:** read a scene, then pick one of its choices. Keys **1–9** pick a choice, **←** goes back one scene, and **Start over** returns to the beginning.
- **Reaching an ending:** the ending card shows how many endings you've found, and offers **Start over** or **Go back**.
- **Settings** are saved per device:
  - themes Paper, Sepia, Night and Zero, or follow the system theme;
  - brightness 30–100%;
  - text size, from 16 to 24 px;
  - serif or sans font.
- **Saving:** every step saves automatically in the background. Reading never waits on the network.
- **Resuming:** comes from your account first, then this device's copy.
  - Progress follows you across devices.
  - Opening a story again offers to resume.
  - **Read again** starts a fresh run. Refreshing after that keeps the new run; it doesn't restart it.

### How progress and endings are counted (rules)
- **Started:** you opened the story.
- **Finished:** you reached at least one ending. A story stays finished if you read it again.
- **Statuses:**
  - **In progress:** started, with no ending yet.
  - **Reading again:** finished before, and mid-run now.
  - **Finished:** reached at least one ending.
  - **All endings:** found every ending.
- **Endings found:** the distinct endings you've reached. If the writer later deletes an ending, it stops counting.
- **Only real reading counts.** An ending is credited only if the run began at the story's start and every step followed an actual choice.
  - Going back is fine.
  - So is losing connection for a few steps (the next save catches up).
  - If a run breaks this rule (usually a hand-made request, or rarely a writer changing the story while you read), your place is still saved. Nothing new is credited until you start the story again from the beginning.
- **Start over** resets only the current run. Endings you found are kept.
- **Old browser progress:** progress kept only in a browser from before accounts saved it is not carried into your account. You still see it on that device.

### Read later
- **Saving:** tap the bookmark on any card, or **Save for later** on the story page. If you're signed out, it opens sign-in and returns you to the page you were on.
- **Separate from progress:** saving never changes your progress, and removing a story never deletes your progress.
- **Finishing doesn't remove it:** a finished story stays on the list until you remove it. Once started, it moves to the other tabs.
- **Header badge:** **My reading** shows how many saved stories you haven't started yet.

### My reading (`/reading`)
- **Links:** **All stories** at the top goes back, and **Find a story** opens the catalogue.
- **Summary:** one friendly sentence, for example "You've finished 7 stories and found 11 endings… Horror seems to be your favourite." It isn't a dashboard, on purpose. It's hidden when you have nothing yet or it can't load.
- **Tabs:**

| Tab | Shows | Button |
|---|---|---|
| **Continue reading** | Stories with a run in progress (first read or re-read), most recent first | **Continue** |
| **Read later** | Saved stories you haven't started, with remove | **Start reading** |
| **Finished** | Stories where you reached an ending, with the endings meter | **Find another ending** (starts a new run), **Read again** once you've found every ending, or **Continue** if you're already mid re-read |

- **Empty tabs** explain what shows up there and link to the catalogue.
- **Privacy:** only you can see this page. Admins see your counts, not a list of what you read.

### Writer profiles (`/writers/:handle`)
These are public. They show the pen name, tagline, bio, genres, location, website, up to 3 social links, "writer since", counts, and the writer's published stories.

---

## 4. Writer flows

### Become a writer (`/become-a-writer`)
You need to be signed in.
1. **Welcome.**
2. **What you get:** the visual branching editor, publishing to readers, and reader insights.
3. **Your profile:**
   - a pen name;
   - a bio;
   - up to 5 genres from the list.
4. **Confirm:** tick the checkbox to accept the terms, then submit.

You get a public handle automatically (you can change it later). Then you land on **My Stories** with a welcome banner.

### Writing desk (`/write`)
Writers only. Readers who open it are sent to Become a writer. Admins without a writer profile are sent to the admin console's Originals.

- **My Stories:** a grid of your drafts and published stories.
- **New story / Edit details:**
  - title (required);
  - description;
  - up to 5 genres and 5 moods from the list;
  - a content rating;
  - up to 10 themes, each 30 characters or fewer.
- **Story overview:**
  - counts of scenes, choices and endings;
  - the **story health** checklist;
  - **Publish / Unpublish**;
  - links to Edit details and the canvas.
- **Canvas (visual editor):**
  - **Scenes:** **Add scene** adds one. Click a scene to edit it in the side panel, which saves automatically. Each scene is a start (mint), a middle scene (lavender) or an ending (blush).
  - **Choices:** drag from one scene to another to add a choice. Drag onto empty space to create a new scene there. Click a choice's label to edit it.
  - **Tidy up** lays the graph out neatly from the start.
  - Deleting a scene asks for confirmation and deletes its choices too.
  - A choice can't lead back to its own scene.

### Publishing rules (story health)
Errors block publishing; warnings don't.

| Level | Message |
|---|---|
| Error | "Add at least one scene before publishing." |
| Error | "No start scene is set." |
| Warning | Several scenes are marked as the start (readers only begin at one). |
| Warning | Some scenes can't be reached from the start. |
| Warning | No ending is reachable from the start, so readers can't finish. |
| Warning | Dead ends: scenes with no choices that aren't marked as endings. |

- **First publish:** it sets the story's publish date, which orders the catalogue. Unpublishing and republishing keeps that date.
- **Deleting a story** removes it, all its scenes and choices, and every reader's progress and Read later entry for it.

### Profile (`/write/profile`)
Edit your public profile with a live preview.

| Field | Rule |
|---|---|
| Handle | 3–30 characters of lowercase letters, numbers and single hyphens; unique; reserved words like `write` and `admin` aren't allowed ("That handle is reserved"). Taken: "That handle is already taken". |
| Website | Must start with `http://` or `https://`. |
| Social links | Up to 3, each on its platform's own domain (X also accepts twitter.com). |
| Avatar and cover | A colour tone from the list. |

---

## 5. Admin flows (`/admin`)

**Getting access.**
- Super admin is granted only from the command line (`make_admin email`, or `create_user email --admin`), never in the app.
- Admins sign in normally and always land on the console.
- The header switch gains an **Admin** tab, the avatar gets a shield, and the account menu shows **Admin console**.

**Every change is logged.** Each change an admin makes writes an audit entry: who, what, when and the details.

| Page | What you can do |
|---|---|
| **Overview** | See headline numbers, 30-day growth, the writer funnel, top writers, genres and moods, recent activity, story-health problems among published stories, and platform reading stats (readers, started, finished, completion rate, endings found, 30-day activity, top genres and stories). |
| **Users** | Search and filter by role and status. **Suspend / reactivate** an account: suspended users can't sign in, and their stories leave the catalogue. **Revoke / restore writer**: their stories leave the catalogue, but nothing is deleted. User detail also shows that person's reading stats. |
| **Stories** | Browse every story on the platform. **Unpublish**, **archive**, **feature** (published stories only, with a rank), **export** as import JSON, and **delete**. Story detail also shows reading stats and how often each ending is reached. |
| **Originals** | Narrive's own stories, owned by the house account `@narrive`. **New Original**, then edit it with the same pages and canvas writers use, but inside the console. Each row has a **Publish / Unpublish** button, and structural errors block publishing. |
| **Import** | Upload a file or paste JSON, then **Check** (writes nothing) and **Import** (all or nothing). **Copy example** gives a sample; **Copy AI prompt** gives the format and rules for asking an AI to write stories. **Undo** removes an import; if any of its stories are published, it asks you to confirm first. |
| **Audit** | Every admin action, filterable by action type, target, admin and date. |

### Admin rules
- **Publishing:** admins can only publish **Originals**. A writer's story can only be published by its writer ("Only the writer can publish their story"). Admins can still unpublish, archive or delete any story.
- **Your own account and other admins:** admins can't change their own account here ("You can't change your own account here"). They can't change another super admin either ("Super admins can't be changed from the app").
- **Restoring writer access** needs an existing writer profile ("This user has never set up a writer profile").
- **Reading stats leave out a writer's own reads.** A writer reading their own story counts only in that writer's personal stats, never in the story or platform totals.
- **Imports:**
  - **Format:** `{"format": "narrive-story", "version": 1, "stories": [...]}`.
  - **Limits:** 2 MB per import, 50 stories per import, 500 scenes per story.
  - **Each story needs** exactly one start scene, choices that point to scenes in the same story, no choice leading back to its own scene, and genres and moods from the official list.
  - **Errors:** each one names its exact place in the file.

---

## 6. Limits at a glance

| Thing | Limit |
|---|---|
| Genres / moods per story | 5 each, from the official list |
| Themes per story | 10, each 30 characters or fewer |
| Genres on a writer profile | 5 |
| Social links | 3 |
| Handle | 3–30 characters |
| Catalogue page | 12 stories per Load more |
| Featured row | 6 stories |
| Import | 2 MB, 50 stories, 500 scenes per story |
| Session | 30 days |

---

## 7. Support answers (common questions)

**"My ending didn't count."**
The run wasn't a continuous path from the start. This can happen when the story was changed while you were reading. Start the story again from the beginning and the endings will count. Endings you'd already found are kept.

**"My old progress disappeared" / "my progress differs between devices."**
Progress saved to your account follows you everywhere. Progress from before accounts saved it lives only in that browser, and isn't moved into your account.

**"A story I was reading vanished."**
- **Possible causes:** the writer unpublished or deleted it, the writer's account was suspended or lost writer access, or an admin unpublished or archived it.
- **Unpublished or hidden:** your progress stays. The story returns if it comes back.
- **Deleted:** progress is removed with it.

**"I can't sign in."**
- "Invalid email or password": check the details. There's no self-service reset yet, so an admin must reset it.
- "This account has been suspended": contact support.

**"Why did it take me to the admin console?"**
Super admins always land there after signing in. Use the header's **Reading** tab to browse as a reader.

**"I can't publish."**
The story health checklist shows an error: there are no scenes, or no start scene is set. Warnings don't block publishing.

**"I finished a story but it's still in Read later."**
That's intended. Finishing never removes a saved story, but it moves from the Read later tab to Finished. Remove it with the bookmark.

**"Why was I signed out?"**
The session expired after 30 days, you signed out in another tab, or an admin suspended the account. A suspension takes effect on the very next request, even mid-session.

---

## 8. Not built yet
- Password reset, changing email, deleting your own account.
- Story analytics for writers on their own stories. Admins already have them.
- Following writers, avatar photo uploads, sharing an ending.
