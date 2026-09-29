# Narrive — Future expansion ideas

Ideas under discussion, not planned or scheduled. Each one gets its own `*-PLAN.md` once it's decided.

---

## Idea 1: Workspaces and Groups

**Status:** idea · **Raised:** 2026-09-29

### The idea

Let an organization run its own space on Narrive and bring its own readers into it. The first use case is education: a school uses interactive stories to teach, either with Narrive's own content or with stories it writes itself. The model is deliberately general, so the same thing works for others too:

- a school teaching a syllabus through branching stories;
- a tutoring centre or an online course;
- a library or a book club reading together;
- a company using interactive scenarios for training or onboarding.

### Naming

The names must not tie the feature to schools. "Class" was rejected for that reason: people would assume it's only for schools.

| Level | Working name | Alternatives considered |
|---|---|---|
| The organization | **Workspace** | Organization; "Agency" was the first idea but sounds like a talent or marketing firm |
| A group of readers inside it | **Group** | Circle (warmer, fits book clubs), Cohort (courses, a bit corporate), Room (suggests live chat) |
| The people in a group | **Members** | |

Not decided yet: Workspace vs Organization, and Group vs Circle.

### Rough shape

- **Workspace:** it has owners or admins and **leads**, the people who run groups. A lead could be a teacher, a facilitator or a trainer.
- **Groups:** a lead creates groups and **assigns stories** to them, from three sources:
  - the public catalogue;
  - Narrive Originals;
  - stories written inside the workspace.
- **Joining:** members join with a **join code**, or are added by the workspace. Many members, especially children, won't have an email address.
- **Private stories:** a story written in a workspace can be visible only to that workspace. This needs a visibility setting beyond today's draft / published / archived.
- **Lead dashboard:** the existing reading stats (`ReadingStatsPanel`) scoped to a group:
  - who started, who finished and which endings each member reached;
  - where members stopped;
  - a per-member view.

### What it builds on

- **Reading stats:** `reading_stats(db, …)` already works for any set of readers, so a group scope is mostly a new filter.
- **Content creation:** the writing desk, the canvas editor and bulk import already cover it.
- **Ending verification:** `_run_is_real` means members can't fake finishing an assigned story.
- **Moderation and oversight:** the admin console patterns (roles, audit log) carry over to workspace admins.

### Open questions

1. **Audience:**
   - Are the first workspaces for young children, for older students and adults, or for businesses?
   - The answer decides how much child-safety and legal work is needed up front.
2. **Pricing:** is it a paid tier from day one (per seat or per workspace), or free at first to get adoption?
3. **Catalogue access:** do members see the public catalogue, or only what their group is assigned?
4. **Verification:** do members without an email need a different sign-in (join code plus username, or accounts created by the lead)? That conflicts with the email-verification rule in [AUTH-PLAN.md](plans/AUTH-PLAN.md).
5. **Membership:** can one person belong to several workspaces, and have a personal Narrive account too?
6. **Single sign-on:** do schools need Google Classroom or Microsoft sign-in, and how soon?

### Risks and constraints

- **Children's data:** COPPA (US) and GDPR-K (EU) mean parental consent, collecting as little data as possible, no public profiles for minors, and a clear policy on deleting data.
- **Sales:** organizations take longer to buy, and they expect invoices, contracts and support.
- **Scope:** this is a large feature (new roles, visibility rules, dashboards). It should come after the public launch and the items in [LAUNCH-AUDIT.md](LAUNCH-AUDIT.md), not before.
