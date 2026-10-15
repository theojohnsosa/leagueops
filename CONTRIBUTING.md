# Contributing to LeagueOps

The goal: nobody edits the same file at the same time. One file, one owner.

## 1. Ownership

### Backend (server/)
| Path | Owner |
|---|---|
| `server.js`, `routes/index.js`, `models/*`, `middleware/*` | Theo |
| `utils/logger.js`, `announcer.js`, `appendOnly.js`, `visibility.js`, `mailer.js`, seed runner, `seedAdmin.js` | Theo |
| `auth`, `users`, `events`, `approvals` controllers and routes | Theo |
| `utils/rulesEngine.js`, `registrations`, `matches`, `announcements` controllers and routes | Andrie |
| `utils/seed/seedSampleData.js`, `archive`, `logs`, `dashboard` controllers and routes | Jasser |

### Frontend (client/src/)
| Path | Owner |
|---|---|
| `App.jsx`, `main.jsx`, `index.css`, `config/*`, `context/*`, `services/api.js`, `components/shared/*` | Jeff |
| `pages/auth/*`, `pages/public/*`, `pages/player/*` | Jeff |
| `pages/admin/users/`, `events/`, `approvals/` | Theo |
| `pages/admin/registrations/`, `schedule/` | Andrie |
| `pages/admin/archive/`, `logs/`, `dashboard/` | Jasser |
| `services/<module>Service.js` and `components/<module>/*` | Same owner as that module's pages |

API contracts: `docs/api/<module>.md` is owned by that module's backend owner.

## 2. Rules that prevent merge conflicts

1. Only edit files you own.
2. Need a change in someone else's file? Ask the owner, or open a tiny PR that touches only that file and tag them. Check open PRs first.
3. Frozen after Phase 0 (nobody edits these again without asking the owner): `server.js`, `routes/index.js`, `App.jsx`, `config/navigation.js`, `models/*`, `middleware/*`, `components/shared/*`, `.env.example`.
4. Need a new shared component? Build it inside your own module folder. Jeff promotes it to `components/shared/` later.
5. Cross-cutting rules live in one helper (for example `visibility.js`). Call it, never rewrite it.
6. Model changes are rare and announced in the group chat first.
7. Announce before installing a new package. If `package-lock.json` conflicts, do not merge it by hand:
```
git checkout origin/main -- package-lock.json
npm install
git add package-lock.json
git commit -m "Resolve package-lock"
```
8. Only Theo edits `.env.example`.
9. Do not reformat files you do not own. Prettier runs on save, so formatting stays consistent.
10. Small PRs: one feature, under about 400 changed lines, merged within a day or two.
11. Pull `main` every morning and before every push.
12. Contract first: the backend owner writes the endpoint in `docs/api/<module>.md` before the frontend builds against it.

## 3. Daily workflow

Start of every session:
```
git checkout main
git pull origin main
git checkout feature/your-branch
git merge main
```

Start a new feature:
```
git checkout main
git pull origin main
git checkout -b feature/<module>-<what>
```
Branch names: `feature/<module>-<what>`, `fix/<module>-<what>`, `chore/<what>`.

While working:
```
git status
git add .
git commit -m "feat(registrations): reject duplicate team names"
```
Run `git status` before every `git add .` and confirm no `.env` file is listed.
Commit format: `feat(module): ...`, `fix(module): ...`, `chore: ...`, `docs: ...`.

Before pushing:
```
git pull origin main
git push -u origin feature/<module>-<what>
```

After your PR merges:
```
git checkout main
git pull origin main
git branch -d feature/<module>-<what>
```

## 4. Pull requests

1. Open the PR on GitHub (base branch: `main`) and fill in the template.
2. Request a review from the module owner or a teammate.
3. Reviewer: open "Files changed", check the author only touched their own files, run the branch locally for bigger changes, then approve.
4. Merge with "Squash and merge", then delete the branch.
5. Respond to reviews within 24 hours. Never merge your own PR without an approval.

## 5. If a conflict happens

1. Run `git merge main`. Git lists the conflicted files.
2. Open each file in VS Code and choose Accept Current, Accept Incoming, or Accept Both (or edit by hand). Remove every `<<<<<<<`, `=======`, `>>>>>>>` marker.
3. If it is a shared file you do not own, message the owner before deciding.
4. Run:
```
git add .
git commit -m "Resolve merge conflict"
```
5. Run the app and test before pushing.
6. To cancel and start over: `git merge --abort`.

## 6. Building a feature (contract first)

1. Backend owner writes or updates `docs/api/<module>.md` (URL, method, who can call it, request, response, errors) and merges it in a docs-only PR.
2. Backend and frontend build in parallel. The frontend develops against fake data with exactly the same shape, controlled by `VITE_USE_MOCK` in each person's own `client/.env`.
3. Backend owner posts "endpoints merged" in the group chat.
4. Frontend pulls `main`, sets `VITE_USE_MOCK=false`, and tests every success and error case.
5. A short call tests both sides together.
6. If a response differs from the doc, the backend fixes it. If the doc is wrong, fix the doc in a tiny PR first and announce it.

## 7. Communication

- Group chat: quick questions, heads-ups, "I'm blocked."
- GitHub Issues: one per task, with the done-when. Decisions that matter are written there.
- PR comments: all code feedback.
- `docs/api/*.md`: source of truth for endpoints.
- Daily 10-minute check-in: yesterday, today, blockers.
- Stuck for more than 30 minutes? Post in the chat.
- Late on a module? Say so early so work can be redistributed.

Message templates:
- Heads-up: `Heads-up: I need to change models/Event.js (add field X). PR in 30 min. Please don't edit it until it's merged.`
- PR ready: `PR ready: feat(auth): signup and login endpoints. Need a review please.`
- Blocked: `Blocked: I need GET /api/events to test the Events page. Using mock data meanwhile.`
- Contract change: `Contract change: login now also returns isActive. Updated docs/api/auth.md in PR #12.`

## 8. Definition of done

- Does what the issue's done-when says, locally, in your own database.
- Tested with the four test accounts (admin, head, committee, player) wherever roles matter.
- Every list is paginated (default 10).
- Loading, empty, and error states exist on every page.
- Flag colors and shared components are used.
- No `.env` files or secrets in the diff.
- `docs/api/<module>.md` updated if an endpoint changed.
- Logger and announcer calls wired where the module requires them.
- PR template filled in and one teammate approved it.

Rules for the shared database: the database named `leagueops` is for the final demo only. Develop in your own database.
