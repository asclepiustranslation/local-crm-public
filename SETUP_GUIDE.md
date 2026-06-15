# Asclepius CRM — Setup & Deployment Guide

> **Project:** A single-page CRM application built for freelance translators, powered by React + Vite.  
> **Source:** [github.com/asclepiustranslation/local-crm-public](https://github.com/asclepiustranslation/local-crm-public)  
> **Hosting platform:** Vercel Hobby (free plan)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Cloning the Repository](#2-cloning-the-repository)
3. [Installing Dependencies](#3-installing-dependencies)
4. [Google OAuth Setup](#4-google-oauth-setup)
5. [Environment Variables (.env)](#5-environment-variables-env)
6. [Running the Development Server](#6-running-the-development-server)
7. [Deploying to Vercel](#7-deploying-to-vercel)
8. [Setting Environment Variables on Vercel](#8-setting-environment-variables-on-vercel)
9. [Updating and Redeploying](#9-updating-and-redeploying)
10. [Contributing](#10-contributing)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Make sure the following tools are installed on your system before proceeding:

| Tool | Minimum Version | Check |
|------|----------------|-------|
| [Node.js](https://nodejs.org/) | v18.x | `node -v` |
| npm | v9.x (bundled with Node.js) | `npm -v` |
| [Git](https://git-scm.com/) | Any recent version | `git --version` |
| Vercel account | — | [vercel.com](https://vercel.com) (sign up with GitHub recommended) |

> **Tip:** Download Node.js from [nodejs.org](https://nodejs.org/en/download). The LTS version is recommended.

---

## 2. Cloning the Repository

Open a terminal and clone the project to your local machine:

```bash
git clone https://github.com/asclepiustranslation/local-crm-public.git
cd local-crm-public
```

> If you are working from your own fork, replace the URL with your username:  
> `git clone https://github.com/YOUR_USERNAME/local-crm-public.git`

---

## 3. Installing Dependencies

Inside the project folder, run:

```bash
npm install
```

This installs all packages listed in `package.json` into the `node_modules/` directory.

**Key packages installed:**

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `recharts` | Chart and statistics visualization |
| `@react-oauth/google` | Google Sign-In (OAuth 2.0) |
| `vite` | Development server and build tool |

---

## 4. Google OAuth Setup

This CRM uses Google Sign-In for authentication. A **Google OAuth Client ID** is required.

### Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and sign in with your Google account.
2. Click **Select a project → New Project** at the top (e.g., name it `asclepius-crm`).
3. In the left menu, navigate to **APIs & Services → OAuth consent screen**:
   - **User Type:** External
   - Fill in the app name, support email, and optional logo.
   - On the **Scopes** step, add `email` and `profile`.
4. Navigate to **Credentials → Create Credentials → OAuth 2.0 Client ID**:
   - **Application type:** Web application
   - **Authorized JavaScript origins:**
     - For local development: `http://localhost:5173`
     - Your Vercel deployment URL: `https://YOUR-APP-NAME.vercel.app`
   - **Authorized redirect URIs:** (not required for this CRM, leave blank)
5. Click **Create** — you will receive a **Client ID**. Copy it.

> **Security:** Never hardcode the Client ID directly in source code. Add it to `.env` as shown in the next step.

---

## 5. Environment Variables (.env)

Create a `.env` file in the project root:

```bash
touch .env
```

Add the following line to the file:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```

Replace `YOUR_CLIENT_ID_HERE` with the Client ID you obtained in Step 4.

> **Why the `VITE_` prefix?** Vite only exposes environment variables prefixed with `VITE_` to the browser. All other variables remain server-side only.

The `.env` file is already listed in `.gitignore` and will not be pushed to GitHub.

---

## 6. Running the Development Server

Start the local development server with:

```bash
npm run dev
```

You will see output similar to:

```
  VITE v8.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open [http://localhost:5173](http://localhost:5173) in your browser to use the app.

**Other useful commands:**

```bash
npm run build    # Compiles the app for production into the dist/ folder
npm run preview  # Serves the compiled build locally for testing
npm run lint     # Runs ESLint to check code quality
```

---

## 7. Deploying to Vercel

### Method A: Vercel CLI (Recommended)

1. Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Log in to your Vercel account:
   ```bash
   vercel login
   ```
   A browser window will open — sign in with GitHub.

3. From inside the project folder, run:
   ```bash
   vercel
   ```
   The CLI will ask a few questions:
   - **Set up and deploy?** → `Y`
   - **Which scope?** → Select your account
   - **Link to existing project?** → `N` (first-time setup)
   - **Project name?** → `local-crm-public` or any name you prefer
   - **In which directory is your code located?** → `./` (press Enter)
   - **Build command, output directory?** → Vite is detected automatically; confirm the defaults

4. For a production deployment:
   ```bash
   vercel --prod
   ```

### Method B: Vercel Dashboard (GUI)

1. Go to [vercel.com/new](https://vercel.com/new).
2. Click **Import Git Repository** and connect your GitHub account.
3. Find `local-crm-public` in the list and click **Import**.
4. On the **Configure Project** screen:
   - **Framework Preset:** Vite (should be detected automatically)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Click **Deploy**.

---

## 8. Setting Environment Variables on Vercel

The local `.env` file is not uploaded to Vercel — you need to add variables separately.

1. Open your project in the Vercel Dashboard.
2. Go to **Settings → Environment Variables**.
3. Add the following variable:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_GOOGLE_CLIENT_ID` | `your-client-id.apps.googleusercontent.com` | Production, Preview, Development |

4. After saving, **redeploy the project** (go to the Deployments tab, right-click the latest deployment, and select "Redeploy").

> **Important:** Make sure your Vercel URL (e.g., `https://local-crm-public.vercel.app`) is added to the **Authorized JavaScript origins** list in Google Cloud Console.

---

## 9. Updating and Redeploying

Once the Vercel project is connected to your GitHub repository, every `git push` to the `main` branch **automatically triggers a new deployment**.

```bash
# Make your changes, then:
git add .
git commit -m "feat: short description of your change"
git push origin main
```

Vercel will build and publish the new version within a few minutes. You can monitor the progress in the Vercel Dashboard under the **Deployments** tab.

---

## 10. Contributing

This project is open to community contributions. To contribute:

1. **Fork the repository:** Click the **Fork** button in the top-right corner on GitHub.
2. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and commit them:
   ```bash
   git commit -m "feat: brief and descriptive message"
   ```
   > Recommended commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
4. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request:** On GitHub, open a PR from your fork targeting the `main` branch of `local-crm-public`. In the PR description, explain what you changed and why.

### Contribution Guidelines

- Follow the existing code style (ESLint rules are included in the project).
- Run `npm run lint` before submitting a PR.
- For significant changes, open an **Issue** first to discuss the approach.
- Never include sensitive information (API keys, Client IDs, etc.) in source code.

---

## 11. Troubleshooting

### `npm install` fails
- Ensure your Node.js version is v18 or higher (`node -v`).
- Delete `node_modules/` and `package-lock.json`, then retry:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### Google Sign-In doesn't work on localhost
- Confirm the `VITE_` prefix is present and correctly spelled in your `.env` file.
- Make sure `http://localhost:5173` is listed in the **Authorized JavaScript origins** in Google Cloud Console.
- Restart the dev server after any `.env` changes (`Ctrl+C` → `npm run dev`).

### Google Sign-In doesn't work on Vercel
- Add your Vercel URL (`https://your-app.vercel.app`) to the Authorized JavaScript origins in Google Cloud Console.
- Verify that `VITE_GOOGLE_CLIENT_ID` is correctly set in Vercel's environment variables.
- Trigger a fresh deployment after making changes.

### Build error: `vite: command not found`
- Run `npm install` again to ensure all dev dependencies are installed.
- Use `npx vite build` as an alternative.

### Vercel deployment fails
- Check the build logs in the Vercel Dashboard for the failing deployment.
- Confirm the build command is `npm run build` and the output directory is `dist`.

---

> **Questions or issues?** Use the GitHub Issues section:  
> [github.com/asclepiustranslation/local-crm-public/issues](https://github.com/asclepiustranslation/local-crm-public/issues)
