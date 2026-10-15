# LeagueOps

Event Registration and Management System for NU Hydroid Olympians (NUHO) at NU MOA.

Stack: MongoDB Atlas, Express, React (Vite), Node.js, Tailwind CSS.
Team: Theo (lead), Andrie, Jeff, Jasser.

Read CONTRIBUTING.md before writing any code.

## First-time setup (do every step, in order)

Type only what is inside the code blocks, never the `PS D:\...>` prompt.

### 1. Accept the GitHub invite
Check your email or github.com/notifications and accept the invite to this repository.

### 2. Install the tools
1. Node.js LTS: nodejs.org
2. Git: git-scm.com
3. VS Code: code.visualstudio.com
4. Restart your PC, then check in PowerShell:
```
node -v
npm -v
git --version
```
5. VS Code extensions: MongoDB for VS Code, ESLint, Prettier - Code formatter, Tailwind CSS IntelliSense, ES7+ React/Redux/React-Native snippets.

### 3. Set your Git identity
Use the same email as your GitHub account:
```
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 4. Clone the repo
```
cd "$HOME\Desktop"
git clone https://github.com/theojohnsosa/leagueops.git
cd leagueops
code .
```
If Git asks you to sign in, choose "Sign in with your browser". If it asks for a password, use a personal access token instead (GitHub Settings > Developer settings > Personal access tokens > Tokens (classic) > tick "repo"). If VS Code asks "Do you trust the authors?", click Yes.

### 5. Install dependencies
```
cd server
npm install
cd ..\client
npm install
cd ..
```

### 6. Create your env files
```
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```
Open `server\.env` and fill in:
- `MONGO_URI`: the connection string Theo sends you privately. It ends with your own database name (for example `/leagueops_andrie`).
- `JWT_SECRET`: generate one with this command and paste the result:
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
- Leave `MAIL_MODE=console`. Verification and reset links are printed in your server terminal, so you do not need any email credentials.
- No quotes and no spaces around `=`.

Never commit `.env` files. Only `.env.example` files belong in Git.

### 7. Run the app
Open two terminals in VS Code.

Terminal 1:
```
cd server
npm run dev
```
Expected: `MongoDB Atlas connected` and `Server running on port 5000`.

Terminal 2:
```
cd client
npm run dev
```

### 8. Check it works
1. http://localhost:5000/api/health shows `"database":"connected"`.
2. http://localhost:5173 loads without errors.

### 9. Seed your database (after the foundation PRs are merged)
```
cd server
npm run seed
```
This creates test accounts and sample data in your own database.

### 10. Practice PR (proves your whole setup works)
Replace `yourname` with your first name in lowercase.
```
git checkout main
git pull origin main
git checkout -b chore/add-yourname-to-team
```
Create `docs/team/yourname.md` with your name, role, and focus area. Then:
```
git add docs/team/yourname.md
git commit -m "chore: add yourname to team docs"
git push -u origin chore/add-yourname-to-team
```
On GitHub, click "Compare & pull request", fill in the template, and request a review from Theo.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Could not read package.json` | Wrong folder. Run server commands in `server`, client commands in `client`. |
| `bad auth: Authentication failed` | Wrong username or password in `MONGO_URI`. Ask Theo. |
| Connection timeout, or IP not allowed | Your network is not allowed in Atlas Network Access. Ask Theo. |
| `querySrv ECONNREFUSED` | `server.js` already uses public DNS. If it still fails, try your phone hotspot, or ask Theo for the standard (non-SRV) connection string. |
| Port 5000 in use | Change `PORT` in `server\.env` and `VITE_API_URL` in `client\.env`, then restart both. |
| Browser shows "Network Error" | Server is not running, or `CLIENT_URL` in `server\.env` is not `http://localhost:5173`. |
| `.env` change not applied | `.env` is only read at startup. Stop the process (Ctrl + C) and run `npm run dev` again. |
| Git asks for a password | Use browser sign-in or a personal access token (step 4). |

## Project structure

```
leagueops/
  server/   Express API (models, controllers, routes, middleware, utils)
  client/   React app (pages, components, services, context)
  docs/     API contracts (docs/api) and team files (docs/team)
```
