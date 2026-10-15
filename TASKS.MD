# LeagueOps Task Guide

A step-by-step guide for Jeff, Andrie, and Jasser. It assumes you have never worked on a team project before, so nothing is skipped.

**How to use it**
1. Read **Part 1** (the everyday Git loop) once. Every task uses it.
2. Jump to your own part: **Jeff = Part 3**, **Andrie = Part 4**, **Jasser = Part 5**.
3. Do the steps in order. Tick the checklist at the end of your part.
4. If something breaks, check **Part 7** first, then message Theo with the exact error text (copy and paste it, don't retype it).

> **Before you start:** you finished `README.md` setup. That means `npm install` is done in `server` and `client`, your `.env` files are filled in, and `http://localhost:5000/api/health` shows `"database": "connected"`.

**A note on the code in this guide.** The code blocks are starting points that follow the contracts in `docs/api/`. If `CONTRIBUTING.md` or Theo says to use different folder names or values, follow them. When you are unsure, ask before you build on top of a guess.

---

## Part 0: Words you will see

| Word | Meaning |
|---|---|
| **Repo** | The project folder that Git tracks, stored on GitHub. |
| **Branch** | Your own copy of the code to work in, so you don't break anyone else's work. |
| **Commit** | A saved snapshot of your changes, with a short message. |
| **Push** | Upload your commits to GitHub. |
| **Pull** | Download other people's changes from GitHub. |
| **PR (pull request)** | A request: "please review my branch and merge it into `main`." |
| **Merge** | Combine a branch into `main`. |
| **Conflict** | Two people changed the same lines, and Git needs a human to choose. |
| **Frontend / client** | What users see: the React app in the `client` folder. |
| **Backend / server** | The Express + MongoDB app in the `server` folder. It answers requests from the client. |
| **API / endpoint** | A URL the server answers, like `POST /api/auth/login`. |
| **Contract** | The written agreement (in `docs/api/`) of what an endpoint accepts and returns. |
| **Model** | A file that defines what one kind of data looks like (`User`, `Event`...). |
| **Seed** | A script that fills a database with starting data. |
| **Mock** | Fake data used in place of the real server, so the frontend can work before the backend exists. |
| **Env file (`.env`)** | Private settings (passwords, connection strings). **Never commit it.** |

---

## Part 1: The everyday Git loop

You will repeat these steps for every task. Always use **PowerShell or the VS Code terminal** from the repo root (`leagueops`).

### Rules that keep us out of trouble
1. **Never work on `main` directly.** Always make a branch.
2. **Only edit files you own.** The ownership table is in `CONTRIBUTING.md`. If you need a change in someone else's file, ask them.
3. **Commit small and often.** A commit every time something works.
4. **Never commit `.env` files.** Check `git status` before every commit.
5. **Pull before you start** each day.

### Step 1: Start from an up-to-date `main`
```powershell
git checkout main
git pull origin main
```
`checkout` switches branches. `pull` downloads the newest work.

### Step 2: Make your branch
```powershell
git checkout -b feature/your-branch-name
```
Use the exact branch name from your task (listed in your part). `-b` means "create it".

Check where you are at any time:
```powershell
git branch
```
The branch with `*` is the one you are on.

### Step 3: Do the work, then check what changed
```powershell
git status
```
This lists the files you changed. **Read it every time.** Red files are changed but not staged. Green files are staged and ready to commit. You should never see a `.env` file here.

### Step 4: Stage and commit
```powershell
git add .
git status
git commit -m "feat: short description of what you did"
```
`git add .` stages everything. The second `git status` double-checks what is about to be saved.

**Commit message format:** `type: short description`

| Type | Use for | Example |
|---|---|---|
| `feat` | A new feature | `feat: add rules engine slot cap check` |
| `fix` | A bug fix | `fix: ignore rejected teams in name check` |
| `chore` | Setup, config, scaffolding | `chore: add client route map` |
| `docs` | Documentation only | `docs: write logs API contract` |
| `test` | Tests | `test: add roster size cases` |

### Step 5: Push your branch
The first time:
```powershell
git push -u origin feature/your-branch-name
```
After that, `git push` is enough.

### Step 6: Open a pull request
1. Go to the repo on GitHub. A yellow banner says **Compare & pull request**. Click it.
2. Fill in the PR template: what you did, how you tested it, anything to watch for.
3. Check that the **base** branch is `main` and the **compare** branch is yours.
4. Click **Create pull request**.
5. Tell Theo in the group chat. Theo reviews and merges.

If Theo asks for changes, fix them on the same branch, then commit and `git push`. The PR updates by itself.

### Step 7: After your PR is merged
```powershell
git checkout main
git pull origin main
```
Then start the next task from Step 2.

### If `main` moved while you were working
Bring the new work into your branch:
```powershell
git checkout main
git pull origin main
git checkout feature/your-branch-name
git merge main
```

### If you get a merge conflict
Git says `CONFLICT` and marks the file like this:
```
<<<<<<< HEAD
your version
=======
their version
>>>>>>> main
```
1. Open the file in VS Code. It shows buttons: **Accept Current**, **Accept Incoming**, **Accept Both**.
2. Pick what is correct (ask the other person if you are unsure). Make sure no `<<<<<<<`, `=======`, or `>>>>>>>` lines remain.
3. Save, then:
```powershell
git add .
git commit -m "chore: resolve merge conflict"
git push
```
If you are stuck, **stop and ask Theo.** Don't delete files to make the conflict go away.

---

## Part 2: Running the project

You need **two terminals** open at the same time.

**Terminal 1: the server**
```powershell
cd server
npm run dev
```
You should see `MongoDB Atlas connected` and `Server running on port 5000`.

**Terminal 2: the client**
```powershell
cd client
npm run dev
```
Vite prints a local address, usually `http://localhost:5173`. Open it in the browser.

**Check both are alive**
- Server: open `http://localhost:5000/api/health`. It should say `"status": "ok"` and `"database": "connected"`.
- Client: the page loads without a red error screen.

Stop a running terminal with `Ctrl + C`.

> `CLIENT_URL` in `server/.env` must match the client address (for example `http://localhost:5173`), or the browser will block requests. That is a CORS error.

---

## Part 3: Jeff, client skeleton

**Branch:** `chore/client-skeleton` **Merges:** second, right after Theo's foundation.

### What you are building and why
A "skeleton" is the frame of the frontend: every page exists but only shows its name, the route map is complete, and login state works. Once it is merged, everyone can build their own pages without touching the same shared files (`App.jsx`, `AuthContext`, `api.js`). That is why it merges early.

By the end you will have:
- A page for every screen, each showing only a title.
- A complete route map in `App.jsx`, with protected routes.
- `AuthContext` (who is logged in) and `api.js` (how to talk to the server).
- A theme file for colors.
- A mock mode, so the whole thing works without the backend.

### Step 1: Make your branch
Follow Part 1, Steps 1 and 2, with `chore/client-skeleton`.

### Step 2: Check the client runs
```powershell
cd client
npm run dev
```
Open the address it prints. If the default Vite page appears, you are ready. Stop it with `Ctrl + C`.

### Step 3: Install the libraries
Open `client/package.json` and look under `dependencies`. If `react-router-dom` or `axios` is missing, install it:
```powershell
npm install react-router-dom axios
```
- **react-router-dom** switches pages without reloading.
- **axios** sends requests to the server.

### Step 4: Create the folders
Inside `client/src`, make these folders if they don't exist: `components`, `context`, `pages`, `services`, `styles`.
```powershell
cd src
mkdir components, context, pages, services, styles
cd ..
```

### Step 5: The theme (colors in one place)
Create `client/src/styles/theme.css`:
```css
/* One place for every color. Components use var(--name), never raw hex codes. */
:root {
  --color-primary: #0038a8;   /* blue */
  --color-accent: #ce1126;    /* red */
  --color-highlight: #fcd116; /* yellow */
  --color-bg: #ffffff;
  --color-surface: #f5f6fa;
  --color-text: #1a1a1a;
  --color-muted: #6b7280;
  --radius: 8px;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
}
```
The hex codes above use the Philippine flag colors as an example. Ask Theo if the team means different colors, then change only this file.

### Step 6: `api.js` (the one place that talks to the server)
Create `client/src/services/api.js`:
```js
import axios from 'axios';

// true when client/.env has VITE_USE_MOCK=true
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // sends the leagueops_token cookie with every request
});

export default api;
```
Open `client/.env.example` to confirm the exact variable names. Use whatever it says.

Why `withCredentials: true`? The login cookie is only sent to the server if you ask axios to include it. Without this line, login seems to work but every later request says "not logged in".

### Step 7: `AuthContext` (who is logged in)
Create `client/src/context/AuthContext.jsx`:
```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import api, { USE_MOCK } from '../services/api.js';

// Same shape as the user object in docs/api/auth.md
const MOCK_USER = {
  _id: 'mock1',
  firstName: 'Mock',
  lastName: 'Player',
  studentEmail: 'mock@students.nu-moa.edu.ph',
  studentId: '2024-000001',
  department: 'BSIT',
  inGameName: 'Mock',
  role: 'player', // change to 'admin' to test admin-only pages
  isActive: true,
  isEmailVerified: true,
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app opens, ask the server "am I still logged in?"
  useEffect(() => {
    async function loadUser() {
      if (USE_MOCK) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        setUser(null); // 401 means not logged in, which is fine
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  async function login(studentEmail, password) {
    if (USE_MOCK) {
      setUser(MOCK_USER);
      return MOCK_USER;
    }
    const { data } = await api.post('/auth/login', { studentEmail, password });
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    if (!USE_MOCK) await api.post('/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Any component can call: const { user, login, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
```

### Step 8: `ProtectedRoute` (the bouncer)
Create `client/src/components/ProtectedRoute.jsx`:
```jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// <ProtectedRoute />                      any logged-in user
// <ProtectedRoute roles={['admin']} />    only these roles
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
```

### Step 9: The placeholder component and all the pages
Create `client/src/components/PagePlaceholder.jsx`:
```jsx
export default function PagePlaceholder({ title }) {
  return (
    <div style={{ padding: 24 }}>
      <h1>{title}</h1>
      <p>This page is not built yet.</p>
    </div>
  );
}
```

Now create one file per page. This PowerShell script makes them all at once. Run it **from the `client` folder**:
```powershell
$pages = "Login","Signup","VerifyEmail","ForgotPassword","ResetPassword",
         "Dashboard","Events","EventDetails","Registrations","Matches",
         "Announcements","Users","Approvals","Archive","Logs","NotFound"

$template = @'
import PagePlaceholder from '../components/PagePlaceholder.jsx';

export default function __NAME__() {
  return <PagePlaceholder title="__NAME__" />;
}
'@

foreach ($p in $pages) {
  $template.Replace('__NAME__', $p) | Set-Content "src/pages/$p.jsx"
}
```
Check that `client/src/pages` now has 16 files. (If you prefer, create them by hand in VS Code with the same content.)

Next, replace `src/pages/Login.jsx` with a version that has a **mock login button**, so you can test without a backend:
```jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { USE_MOCK } from '../services/api.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleMockLogin() {
    await login();
    navigate('/dashboard');
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Login</h1>
      <p>The real login form comes in Phase 1.</p>
      {USE_MOCK && <button onClick={handleMockLogin}>Log in as mock user</button>}
    </div>
  );
}
```

### Step 10: `App.jsx` (the route map)
Replace the contents of `client/src/App.jsx`:
```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Events from './pages/Events.jsx';
import EventDetails from './pages/EventDetails.jsx';
import Registrations from './pages/Registrations.jsx';
import Matches from './pages/Matches.jsx';
import Announcements from './pages/Announcements.jsx';
import Users from './pages/Users.jsx';
import Approvals from './pages/Approvals.jsx';
import Archive from './pages/Archive.jsx';
import Logs from './pages/Logs.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public: anyone can open these */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Any logged-in user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/registrations" element={<Registrations />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/announcements" element={<Announcements />} />
      </Route>

      {/* Role-restricted. Confirm the exact roles with Theo and CONTRIBUTING.md */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/users" element={<Users />} />
        <Route path="/logs" element={<Logs />} />
      </Route>
      <Route element={<ProtectedRoute roles={['admin', 'head']} />}>
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/archive" element={<Archive />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
```
The `:token` and `:id` parts are variables in the URL. The page reads them with `useParams()` later.

### Step 11: Connect everything in `main.jsx`
Open `client/src/main.jsx` and make it look like this. Keep any extra imports it already has, like `index.css`, unless they clash with the theme.
```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/theme.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```
**Order matters.** `BrowserRouter` goes outside, then `AuthProvider`, then `App`.

### Step 12: Test it in mock mode
1. In `client/.env`, set `VITE_USE_MOCK=true`.
2. Restart the client (`Ctrl + C`, then `npm run dev`). Vite only reads `.env` at startup.
3. Open `/dashboard`. You should be sent to `/login`, because you aren't logged in.
4. Click **Log in as mock user**. You should land on `/dashboard`.
5. Visit `/events`, `/matches`, `/announcements`. Each shows its title.
6. Visit `/users`. As a `player` you should be bounced to `/dashboard`.
7. In `AuthContext.jsx`, change the mock `role` to `'admin'`, refresh, log in again, and `/users` should open.
8. Visit `/nonsense`. You should see the NotFound page.
9. Change the mock role back to `'player'` before you commit.

### Step 13: Commit and open the PR
Follow Part 1, Steps 3 to 6.
- Check that `git status` shows no `.env`.
- Commit message: `chore: add client skeleton with routes, auth context and mock mode`.
- In the PR description, list the 16 pages, say how to test mock mode, and mention `VerifyEmail` and the `/verify-email/:token` route.

### Jeff's definition of done
- [ ] The client starts with no errors.
- [ ] 16 page files exist, and each shows its title.
- [ ] Every route in `App.jsx` opens the right page.
- [ ] Protected routes redirect to `/login`; role routes redirect to `/dashboard`.
- [ ] Mock mode works, and the mock user shape matches `docs/api/auth.md`.
- [ ] `VerifyEmail` and `/verify-email/:token` are included.
- [ ] No `.env` in the commit. PR opened.

**After it merges:** Phase 1 is the layout (navbar, sidebar) and the real login, signup, and verify pages, built against `docs/api/auth.md`.

---

## Part 4: Andrie, registration rules engine

**Branch:** `feature/registrations-rules-engine` **Depends on:** nobody. You can start right now.

### What you are building and why
When a team tries to register for an event, the server must check a list of rules: is registration open, are there free slots, is the team name taken, and so on. You will write those checks as **pure functions**: they take data in and return a result, and they don't touch the database or Express. That makes them:
- **Easy to test.** You can test every rule with plain fake data, no database needed.
- **Reusable.** Later, the registrations controller loads data from the database and calls your function.

### The six rules

| # | Rule | Fails when | Error code |
|---|---|---|---|
| 1 | Registration window | Now is before `registrationOpenDate` or after `registrationClosedDate` | `REGISTRATION_CLOSED` |
| 2 | Slot cap | Accepted teams already reach `maxSlots` | `SLOTS_FULL` |
| 3 | Duplicate team name | Another active team in the event has the same name (ignoring case and extra spaces) | `DUPLICATE_TEAM_NAME` |
| 4 | Duplicate roster | Another active team has exactly the same players | `DUPLICATE_ROSTER` |
| 5 | Roster size | Player count is not `playersPerTeam`, or one player is listed twice | `INVALID_ROSTER_SIZE`, `ROSTER_HAS_DUPLICATES` |
| 6 | Player conflict | A player is already on an **accepted** team in the same event | `PLAYER_ALREADY_REGISTERED` |

"Active" means status `pending` or `accepted`. Teams that are `rejected` or `cancelled` don't block anything.

**Decisions this code makes.** Confirm them with Theo, since a different answer means a small change:
- Only **accepted** teams use up a slot (pending ones don't).
- A player on a **pending** team can still join another team. Only accepted teams block them.
- Missing registration dates are treated as "closed".

### Step 1: Make your branch
Follow Part 1, Steps 1 and 2, with `feature/registrations-rules-engine`.

### Step 2: Create the folder and the rules file
Inside `server`, create `utils/rulesEngine.js` (if the `utils` folder doesn't exist, create it too).

> Theo is also adding files to `server/utils/`. That is fine because the file names differ, so Git won't conflict.

Paste this:

```js
// server/utils/rulesEngine.js
//
// The registration rules, written as PURE functions:
//   - no database, no Express, no req/res
//   - same input always gives the same output
// That is what makes them easy to test and easy for the controller to reuse.
//
// Shapes used (they match the Event and Registration models):
//   event: { registrationOpenDate, registrationClosedDate, maxSlots, playersPerTeam }
//   registration: { teamName, status, playerDetails: [{ studentId, ... }] }
//
// "existingRegistrations" must contain only the registrations of the SAME event.

// Statuses that still "hold" a team name / roster. Rejected and cancelled ones don't.
const ACTIVE_STATUSES = ['pending', 'accepted'];

// ---------- small helpers ----------

export function normalizeTeamName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isActive(registration) {
  return ACTIVE_STATUSES.includes(registration.status);
}

function studentIdsOf(registration) {
  return (registration.playerDetails ?? [])
    .map((player) => String(player.studentId ?? '').trim())
    .filter(Boolean);
}

function error(code, message) {
  return { code, message };
}

// ---------- the six rules ----------
// Each rule returns an array of errors. An empty array means "this rule passed".

// Rule 1: registration window
export function checkRegistrationWindow(event, now = new Date()) {
  const open = event.registrationOpenDate ? new Date(event.registrationOpenDate) : null;
  const close = event.registrationClosedDate ? new Date(event.registrationClosedDate) : null;

  if (!open || !close) {
    return [error('REGISTRATION_CLOSED', 'Registration dates are not set for this event.')];
  }
  if (now < open) {
    return [error('REGISTRATION_CLOSED', 'Registration has not opened yet.')];
  }
  if (now > close) {
    return [error('REGISTRATION_CLOSED', 'Registration is closed.')];
  }
  return [];
}

// Rule 2: slot cap (only ACCEPTED teams use up a slot)
export function checkSlotCap(event, existingRegistrations) {
  if (event.maxSlots == null) return []; // no cap set
  const accepted = existingRegistrations.filter((r) => r.status === 'accepted').length;
  if (accepted >= event.maxSlots) {
    return [error('SLOTS_FULL', 'All slots for this event are taken.')];
  }
  return [];
}

// Rule 3: team name must be unique in the event (ignores case and extra spaces)
export function checkDuplicateTeamName(newRegistration, existingRegistrations) {
  const wanted = normalizeTeamName(newRegistration.teamName);
  const taken = existingRegistrations.some(
    (r) => isActive(r) && normalizeTeamName(r.teamName) === wanted
  );
  return taken ? [error('DUPLICATE_TEAM_NAME', 'That team name is already taken.')] : [];
}

// Rule 4: the exact same roster cannot be registered twice (order does not matter)
export function checkDuplicateRoster(newRegistration, existingRegistrations) {
  const key = (ids) => [...ids].sort().join('|');
  const newIds = studentIdsOf(newRegistration);
  if (newIds.length === 0) return [];
  const same = existingRegistrations.some(
    (r) => isActive(r) && key(studentIdsOf(r)) === key(newIds)
  );
  return same ? [error('DUPLICATE_ROSTER', 'This exact roster is already registered.')] : [];
}

// Rule 5: roster must have exactly playersPerTeam players, with no repeats
export function checkRosterSize(event, newRegistration) {
  const ids = studentIdsOf(newRegistration);
  const errors = [];
  if (ids.length !== event.playersPerTeam) {
    errors.push(
      error('INVALID_ROSTER_SIZE', `A team needs exactly ${event.playersPerTeam} players.`)
    );
  }
  if (new Set(ids).size !== ids.length) {
    errors.push(error('ROSTER_HAS_DUPLICATES', 'The same player is listed more than once.'));
  }
  return errors;
}

// Rule 6: a player cannot be on two ACCEPTED teams in the same event
export function checkPlayerConflicts(newRegistration, existingRegistrations) {
  const taken = new Set();
  for (const r of existingRegistrations) {
    if (r.status === 'accepted') studentIdsOf(r).forEach((id) => taken.add(id));
  }
  const conflicts = studentIdsOf(newRegistration).filter((id) => taken.has(id));
  if (conflicts.length === 0) return [];
  return [
    error(
      'PLAYER_ALREADY_REGISTERED',
      `Already on an accepted team: ${conflicts.join(', ')}.`
    ),
  ];
}

// ---------- run everything ----------

export function validateRegistration(event, newRegistration, existingRegistrations, now = new Date()) {
  const errors = [
    ...checkRegistrationWindow(event, now),
    ...checkSlotCap(event, existingRegistrations),
    ...checkDuplicateTeamName(newRegistration, existingRegistrations),
    ...checkDuplicateRoster(newRegistration, existingRegistrations),
    ...checkRosterSize(event, newRegistration),
    ...checkPlayerConflicts(newRegistration, existingRegistrations),
  ];
  return { ok: errors.length === 0, errors };
}
```

### Step 3: Understand each part
- **`normalizeTeamName`** trims spaces and lowercases, so "Team  Alpha" and "team alpha" count as the same.
- **`studentIdsOf`** pulls the student IDs out of a registration's `playerDetails`.
- **Each `check...` function** is one rule. It returns a list of errors: empty means passed.
- **`validateRegistration`** runs all six and returns `{ ok, errors }`. It returns all the problems at once, not just the first, so a student can fix everything in one go.
- **`now = new Date()`** is a parameter so tests can pretend it is any date.

### Step 4: Create the test file
Create `server/utils/rulesEngine.test.js`:

```js
// server/utils/rulesEngine.test.js
// Run from the server folder with:  node utils/rulesEngine.test.js

import assert from 'node:assert/strict';
import { validateRegistration } from './rulesEngine.js';

// ---------- tiny test runner ----------
let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}\n      ${err.message}`);
    failed++;
  }
}

// ---------- helpers that build fake data ----------
const NOW = new Date('2026-11-10T12:00:00Z');

function makeEvent(overrides = {}) {
  return {
    registrationOpenDate: '2026-11-01T00:00:00Z',
    registrationClosedDate: '2026-11-20T00:00:00Z',
    maxSlots: 8,
    playersPerTeam: 3,
    ...overrides,
  };
}

function makeReg(teamName, studentIds, status = 'pending') {
  return { teamName, status, playerDetails: studentIds.map((studentId) => ({ studentId })) };
}

function codesOf(result) {
  return result.errors.map((e) => e.code);
}

// ---------- tests ----------
console.log('Rules engine');

test('a valid registration passes', () => {
  const result = validateRegistration(makeEvent(), makeReg('Alpha', ['1', '2', '3']), [], NOW);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('rejects before the window opens', () => {
  const event = makeEvent({ registrationOpenDate: '2026-11-15T00:00:00Z' });
  const result = validateRegistration(event, makeReg('Alpha', ['1', '2', '3']), [], NOW);
  assert.deepEqual(codesOf(result), ['REGISTRATION_CLOSED']);
});

test('rejects after the window closes', () => {
  const event = makeEvent({ registrationClosedDate: '2026-11-05T00:00:00Z' });
  const result = validateRegistration(event, makeReg('Alpha', ['1', '2', '3']), [], NOW);
  assert.deepEqual(codesOf(result), ['REGISTRATION_CLOSED']);
});

test('rejects when all slots are taken', () => {
  const event = makeEvent({ maxSlots: 2 });
  const existing = [makeReg('A', ['10', '11', '12'], 'accepted'), makeReg('B', ['20', '21', '22'], 'accepted')];
  const result = validateRegistration(event, makeReg('Alpha', ['1', '2', '3']), existing, NOW);
  assert.deepEqual(codesOf(result), ['SLOTS_FULL']);
});

test('pending teams do not use up slots', () => {
  const event = makeEvent({ maxSlots: 1 });
  const existing = [makeReg('A', ['10', '11', '12'], 'pending')];
  const result = validateRegistration(event, makeReg('Alpha', ['1', '2', '3']), existing, NOW);
  assert.equal(result.ok, true);
});

test('rejects a duplicate team name (ignores case and spaces)', () => {
  const existing = [makeReg('Team  Alpha', ['10', '11', '12'])];
  const result = validateRegistration(makeEvent(), makeReg('  team alpha ', ['1', '2', '3']), existing, NOW);
  assert.deepEqual(codesOf(result), ['DUPLICATE_TEAM_NAME']);
});

test('a rejected team does not block its name', () => {
  const existing = [makeReg('Alpha', ['10', '11', '12'], 'rejected')];
  const result = validateRegistration(makeEvent(), makeReg('Alpha', ['1', '2', '3']), existing, NOW);
  assert.equal(result.ok, true);
});

test('rejects the same roster in a different order', () => {
  const existing = [makeReg('Beta', ['3', '1', '2'])];
  const result = validateRegistration(makeEvent(), makeReg('Alpha', ['1', '2', '3']), existing, NOW);
  assert.ok(codesOf(result).includes('DUPLICATE_ROSTER'));
});

test('rejects a roster that is too small', () => {
  const result = validateRegistration(makeEvent(), makeReg('Alpha', ['1', '2']), [], NOW);
  assert.deepEqual(codesOf(result), ['INVALID_ROSTER_SIZE']);
});

test('rejects a roster that is too big', () => {
  const result = validateRegistration(makeEvent(), makeReg('Alpha', ['1', '2', '3', '4']), [], NOW);
  assert.deepEqual(codesOf(result), ['INVALID_ROSTER_SIZE']);
});

test('rejects the same player listed twice', () => {
  const result = validateRegistration(makeEvent(), makeReg('Alpha', ['1', '1', '2']), [], NOW);
  assert.deepEqual(codesOf(result), ['ROSTER_HAS_DUPLICATES']);
});

test('rejects a player who is already on an accepted team', () => {
  const existing = [makeReg('Beta', ['3', '8', '9'], 'accepted')];
  const result = validateRegistration(makeEvent(), makeReg('Alpha', ['1', '2', '3']), existing, NOW);
  assert.deepEqual(codesOf(result), ['PLAYER_ALREADY_REGISTERED']);
});

test('a player on a pending team is still allowed', () => {
  const existing = [makeReg('Beta', ['3', '8', '9'], 'pending')];
  const result = validateRegistration(makeEvent(), makeReg('Alpha', ['1', '2', '3']), existing, NOW);
  assert.equal(result.ok, true);
});

test('reports several problems at once', () => {
  const event = makeEvent({ registrationClosedDate: '2026-11-05T00:00:00Z' });
  const result = validateRegistration(event, makeReg('Alpha', ['1', '2']), [], NOW);
  assert.deepEqual(codesOf(result), ['REGISTRATION_CLOSED', 'INVALID_ROSTER_SIZE']);
});

// ---------- summary ----------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

### Step 5: Run the tests
From the `server` folder:
```powershell
node utils/rulesEngine.test.js
```
You should see a ✓ for every test and `14 passed, 0 failed`. If one fails, read its message. It says what was expected and what happened.

> Don't edit `server/package.json` to add a test script. Theo is changing that file too, and two people editing it causes conflicts. Run the command above directly.

### Step 6: Break it on purpose (to understand it)
1. In `rulesEngine.js`, change `accepted >= event.maxSlots` to `accepted > event.maxSlots`.
2. Run the tests. The slot cap test should fail.
3. Change it back and run again. Everything should pass.

This shows what the tests are for.

### Step 7: Add your own test
Pick a case the tests don't cover, such as a team whose name is empty, and add a `test(...)` block. If it fails, decide whether the rule needs fixing.

### Step 8: Commit and open the PR
Follow Part 1, Steps 3 to 6.
- Files: `server/utils/rulesEngine.js` and `server/utils/rulesEngine.test.js` only.
- Commit message: `feat: add registration rules engine with tests`.
- In the PR description, list the six rules, the decisions above, and paste the test output.

### How this gets used later (Phase 1)
In the registrations controller, the flow will be: load the event, load the registrations for that event from the database, call `validateRegistration(event, newRegistration, existingRegistrations)`, and if `ok` is false, send a `400` with the errors. You don't have to build that yet.

### Andrie's definition of done
- [ ] All six rules are implemented as pure functions.
- [ ] Test file covers each rule, and all tests pass.
- [ ] Nothing imports mongoose or express.
- [ ] You asked Theo to confirm the three decisions.
- [ ] Only the two files are in the commit. PR opened.

---

## Part 5: Jasser, API docs and sample data

**Branches:** two separate ones, so each PR stays small and easy to review.
1. `docs/logs-archive-dashboard` for the API contracts (start now).
2. `feature/seed-sample-data` for the seed script (start after Theo's models are merged).

### Part 5A: Write three API contracts (start today)

#### What a contract is and why
A contract in `docs/api/` says exactly what each endpoint accepts and returns. Jeff builds screens against it before the backend exists, and you build the backend to match it. If it's vague, the two sides won't fit together.

#### Step 1: Make the docs branch
```powershell
git checkout main
git pull origin main
git checkout -b docs/logs-archive-dashboard
```

#### Step 2: Read two examples first
Open `docs/api/README.md` (the conventions) and `docs/api/auth.md` (a finished contract). Copy their style exactly: the same error shape, list shape, and "Who / Body / Success / Errors" layout.

Remember the roles are `admin`, `head`, `committee`, and `player`.

#### Step 3: Fill in `logs.md`
Open `docs/api/logs.md` and replace the placeholder. Suggested content (adjust if you see a better design):

```markdown
# Logs API

Owner: Jasser. See README.md in this folder for conventions.

## Log objects

Audit log (who did what in the system):
{
  "_id": "...",
  "actorId": "...",
  "actorName": "Juan Cruz",
  "actorRole": "admin",
  "action": "USER_DEACTIVATED",
  "targetType": "User",
  "targetId": "...",
  "description": "Deactivated account 2024-123456",
  "createdAt": "2026-11-10T04:00:00.000Z"
}

Event log has the same fields, plus `eventId` and `changes` (what changed, before and after), and has no `targetType` or `targetId`.

Logs are append-only: they can be read, never edited or deleted.

---

### GET /api/logs/audit
Who: admin
Query: standard list params (`page`, `limit`, `search`, `sort`) plus `action`, `actorId`, `from`, `to` (ISO dates)
Success: `200` `{ "items": [ ...audit logs ], "total": 0, "page": 1, "totalPages": 1 }`
Errors: `401` `NOT_LOGGED_IN`, `403` `FORBIDDEN`

### GET /api/logs/events
Who: admin, head
Query: standard list params plus `eventId`, `action`, `from`, `to`
Success: `200` list of event logs
Errors: `401` `NOT_LOGGED_IN`, `403` `FORBIDDEN`
```
(In the real file, wrap the JSON in code fences as `auth.md` does.)

#### Step 4: Fill in `archive.md` and `dashboard.md`
Use the same layout. These are the endpoints to describe (proposals, so tell Theo, because events and approvals are his modules):

**Archive** (`archive.md`)
- `GET /api/archive`: list archived events (admin, head).
- `POST /api/archive/:eventId`: archive an event. Body: `{ "reason" }`.
- `POST /api/archive/:eventId/restore`: restore an archived event.
- These use the Event fields `isArchived`, `archivedAt`, `archivedBy`, `archiveReason`, `restoredAt`, `restoredBy`.

**Dashboard** (`dashboard.md`)
- `GET /api/dashboard/summary`: counts such as total events, active events, pending approvals, total registrations, upcoming matches.
- `GET /api/dashboard/recent-activity`: the latest few log entries.
- Decide what each role sees and write it under "Who".

For every endpoint, fill in: Who, Body or Query, Success (status and JSON), Errors (status and code). Add the error codes you invent so Jeff can handle them.

#### Step 5: Update the status table
In `docs/api/README.md`, the Status table already lists these files and you as owner. No change is needed unless you rename a file.

#### Step 6: Commit and open the PR
Follow Part 1, Steps 3 to 6.
- Files: `docs/api/logs.md`, `docs/api/archive.md`, `docs/api/dashboard.md` only.
- Commit message: `docs(api): write logs, archive and dashboard contracts`.
- Tag Theo and Jeff in the PR. Per the README, contract changes are announced in the group chat.

### Part 5B: The sample data script (after the models are merged)

#### What it is and why
Without data, every page looks empty and nobody can test lists, tables, or the dashboard. This script fills your own database with fake users, an event, teams, matches, and an announcement, so everyone's screens have something to show.

#### Step 1: Wait for the models, then get them
Theo will tell you when the foundation is merged. Then:
```powershell
git checkout main
git pull origin main
git checkout -b feature/seed-sample-data
```
Check that `server/models/` now has `User.js`, `Event.js`, `Registration.js`, and the rest.

#### Step 2: Create the script
Create `server/seeds/seedSampleData.js`. If Theo's seed runner uses a different folder, put it there instead. Paste:

```js
// server/seeds/seedSampleData.js
// Fills YOUR OWN database with fake data so the app has something to show.
// Run from the server folder:  node seeds/seedSampleData.js

import dns from 'node:dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Event, Registration, Match, Announcement } from '../models/index.js';

dns.setServers(['8.8.8.8', '1.1.1.1']); // same network workaround as server.js
dotenv.config();

const SAMPLE_PASSWORD = 'Password123'; // every sample user logs in with this
const SAMPLE_ID_PREFIX = '9999-';      // marks sample users so we can find them again
const EVENT_TITLE = '[Sample] Mobile Legends Cup';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const dbName = mongoose.connection.name;

  // Safety: never touch the shared demo database by accident.
  if (dbName === 'leagueops' && process.env.ALLOW_SHARED_DB !== 'true') {
    console.error('Refusing to seed the shared "leagueops" database.');
    process.exit(1);
  }
  console.log(`Seeding database: ${dbName}`);

  // 1. Remove old sample data, so running the script twice does not duplicate it.
  const oldEvents = await Event.find({ title: EVENT_TITLE }).select('_id');
  const oldEventIds = oldEvents.map((e) => e._id);
  await Match.deleteMany({ eventId: { $in: oldEventIds } });
  await Registration.deleteMany({ eventId: { $in: oldEventIds } });
  await Announcement.deleteMany({ eventId: { $in: oldEventIds } });
  await Event.deleteMany({ _id: { $in: oldEventIds } });
  await User.deleteMany({ studentId: { $regex: `^${SAMPLE_ID_PREFIX}` } });

  // 2. Users: 20 players
  const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10);
  const players = await User.insertMany(
    Array.from({ length: 20 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return {
        studentId: `${SAMPLE_ID_PREFIX}0000${n}`,
        firstName: `Player${n}`,
        lastName: 'Sample',
        studentEmail: `player${n}.sample@students.nu-moa.edu.ph`,
        department: 'BSIT',
        inGameName: `Sample${n}`,
        passwordHash,
        role: 'player',
        isEmailVerified: true,
      };
    })
  );

  // 3. One event
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const event = await Event.create({
    title: EVENT_TITLE,
    game: 'Mobile Legends',
    type: 'Tournament',
    season: 'A.Y. 2026-2027',
    venue: 'NU MOA Gym',
    registrationOpenDate: new Date(now - 7 * day),
    registrationClosedDate: new Date(now + 7 * day),
    eventStartDate: new Date(now + 14 * day),
    eventEndDate: new Date(now + 15 * day),
    playersPerTeam: 5,
    maxSlots: 8,
    status: 'upcoming',
    approvalStatus: 'approved',
    createdBy: players[0]._id,
  });

  // 4. Four teams of 5 players each, all accepted
  const teams = [];
  for (let t = 0; t < 4; t++) {
    const members = players.slice(t * 5, t * 5 + 5);
    teams.push(
      await Registration.create({
        eventId: event._id,
        submittedBy: members[0]._id,
        teamName: `Team ${['Alpha', 'Bravo', 'Charlie', 'Delta'][t]}`,
        division: 'Open',
        status: 'accepted',
        playerDetails: members.map((m) => ({
          userId: m._id,
          studentId: m.studentId,
          firstName: m.firstName,
          lastName: m.lastName,
          inGameName: m.inGameName,
        })),
      })
    );
  }

  // 5. Two matches
  await Match.insertMany([
    { eventId: event._id, matchNumber: 1, round: 'Semifinals', teamA: teams[0].teamName, teamB: teams[1].teamName, status: 'scheduled' },
    { eventId: event._id, matchNumber: 2, round: 'Semifinals', teamA: teams[2].teamName, teamB: teams[3].teamName, status: 'scheduled' },
  ]);

  // 6. One announcement
  await Announcement.create({
    eventId: event._id,
    title: 'Registration is open',
    message: 'Sign up your team before the deadline.',
    type: 'general',
  });

  console.log('Done: 20 users, 1 event, 4 registrations, 2 matches, 1 announcement.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
```

#### Step 3: Understand it
- It connects using the `MONGO_URI` in **your** `.env`, which points at your own database.
- **It refuses to run on the shared `leagueops` database**, to protect the demo data.
- It deletes the old sample data first, so you can run it again without duplicates.
- Sample users have student IDs starting `9999-` and the password `Password123`.
- It creates 20 users, 1 event, 4 accepted teams of 5 players, 2 matches, and 1 announcement.

#### Step 4: Run it
From the `server` folder:
```powershell
node seeds/seedSampleData.js
```
Expected output: `Seeding database: leagueops_yourname`, then `Done: 20 users, 1 event, ...`.

#### Step 5: Check it worked
1. In Atlas, open **Browse Collections** for the cluster and pick your database (for example `leagueops_jasser`).
2. You should see `users`, `events`, `registrations`, `matches`, and `announcements` with documents in them.
3. Run the script a second time. The counts shouldn't double.

If it fails with a validation error, a model field name probably differs from the script. Read the message and compare the field with the model file. If the model is wrong, tell Theo instead of editing his file.

#### Step 6: Review the indexes
An **index** is like a book's index: it makes lookups fast. You were asked to review them, which means reading each model and asking whether the app's searches will be fast and safe.

For each file in `server/models/`:
1. Find the lines with `unique: true` or `index`.
2. Think about the searches the app will do: list registrations for one event, find a user by student email, list logs newest first, show archived events.
3. Write down any field used in those searches that has no index, and anything that should be unique but isn't.

Things to check:
- `User`: `studentEmail` and `studentId` are unique.
- `Registration`: searched by `eventId` and `status`.
- `Match`: searched by `eventId`.
- `AuditLog` and `EventLog`: sorted by newest first.
- Token models: expire automatically.

**Don't edit Theo's model files.** Write your findings in the PR description or send them to Theo, who decides.

#### Step 7: Commit and open the PR
Follow Part 1, Steps 3 to 6.
- Commit message: `feat: add sample data seed script`.
- In the PR, say how to run it and include your index notes.

### Jasser's definition of done
- [ ] `logs.md`, `archive.md`, `dashboard.md` are complete and follow the template.
- [ ] Docs PR opened, and Theo and Jeff are told.
- [ ] Seed script runs on your database, and running it twice doesn't duplicate.
- [ ] Sample data is visible in Atlas.
- [ ] Index notes are sent to Theo.
- [ ] No `.env` in any commit.

---

## Part 6: After the foundation and skeleton are merged

**Merge order:** setup files, then Theo's foundation, then Jeff's skeleton. Nobody starts a feature branch before the second two are merged.

When Theo says both are merged, **everyone** runs:
```powershell
git checkout main
git pull origin main
cd server
npm install
cd ../client
npm install
cd ..
```
Re-running `npm install` picks up any new libraries someone added. Then run your seed (once Jasser's script exists), restart both servers, and start Phase 1:

| Who | Phase 1 |
|---|---|
| Theo | Auth endpoints (signup, verify, login, logout, me, forgot and reset password) |
| Jeff | Layout and the login, signup, and verify pages |
| Andrie | Registrations backend |
| Jasser | Logs backend |

Detailed steps for Phase 1 will come in the next guide.

---

## Part 7: When something goes wrong

| Problem | What to do |
|---|---|
| `npm install` fails | Delete the `node_modules` folder, then run `npm install` again. Check your Node version with `node -v`. |
| `MongoDB connection failed: ... ENOTFOUND` or `querySrv` | DNS problem on your network. Make sure the `dns.setServers` lines are in `server.js`. Try another network or a phone hotspot. |
| `Authentication failed` | The username or password in `MONGO_URI` is wrong. Ask Theo to double check it. Avoid special characters in passwords. |
| `IP not whitelisted` or timeout | Ask Theo to confirm the `0.0.0.0/0` entry in Atlas is active. |
| `EADDRINUSE: port 5000` | Something is already using the port. Close other terminals running the server. |
| Browser shows a CORS error | `CLIENT_URL` in `server/.env` doesn't match the client address. Fix it and restart the server. |
| Client says `Failed to fetch` or `Network Error` | The server isn't running, or `VITE_API_URL` is wrong. |
| Changed `.env` but nothing changed | Restart the server or client. `.env` is only read at startup. |
| `Cannot find module` or `ERR_MODULE_NOT_FOUND` | Wrong file path or a missing `.js` extension in a server import. Server imports need the extension: `./models/User.js`. |
| `git push` rejected | Someone pushed first. Run `git pull origin your-branch-name`, then push again. |
| You edited files on `main` by mistake | Don't commit. Run `git checkout -b your-branch-name`. Your changes come with you. |
| You committed a `.env` | **Stop and tell Theo right away.** The passwords in it need to be changed. |
| Your PR shows hundreds of changed files | You probably committed `node_modules`. Tell Theo before you push anything else. |
| Anything else | Copy the **exact** error text and the command you ran, and send them to Theo. |

---

## Part 8: Quick reference

**Daily start**
```powershell
git checkout main
git pull origin main
git checkout your-branch-name
git merge main
```

**Save and share work**
```powershell
git status
git add .
git commit -m "type: what you did"
git push
```

**Ask for review:** open the PR on GitHub, then message the group chat.

**Never**
- Work on `main`.
- Commit `.env` or `node_modules`.
- Edit files you don't own without asking.
- Force push (`git push --force`).
- Post connection strings or passwords in the group chat.