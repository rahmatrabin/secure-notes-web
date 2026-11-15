# Secure Notes

[Open Secure Notes](https://sec-notes.vercel.app) · [Backend repository](https://github.com/rahmatrabin/secure-notes-api) · [API health](https://secure-notes-api-sdr9.onrender.com/health)

Secure Notes is a small web app for keeping notes and publishing posts that anyone can read. This repository contains the frontend, built with React, TypeScript, and Vite. The API runs separately on Render.

## Using the app

- **My notes** is where you create, edit, and delete your own notes.
- **Public posts** is where you publish a separate public post or find another author's posts by Author ID. Visitors can read public posts without signing in.
- Admins also see **All notes**, **Users**, and **Interests**. They can add, edit, or deactivate regular accounts, see everyone's notes, and browse users by interest.

To share an author's posts, open their page and copy its URL. The link uses `/?author=<author-id>`. You can also open an author's page from **Users** or **Interests** as an admin.

The browser keeps the access token in memory. Reloading the page or signing out clears the browser session. The API enforces access rules for protected requests.

## Run it locally

Use Node.js 24 and npm. Start the API by following the backend README, then run these commands from the frontend repository in PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open [localhost:5173](http://localhost:5173) and sign in with an account you created through the backend setup. The example environment file sets `VITE_API_BASE_URL=http://localhost:4000`. Change it if your API runs somewhere else. For a local frontend, set `FRONTEND_ORIGIN=http://localhost:5173` in the backend environment.

Use `npm run build` to type-check the project and build it into `dist/`. To preview that build, run `npm run preview`. If you sign in from a different preview origin, update the backend's allowed origin to match it.

## Deploy to Vercel

Import this repository as a Vite project. Use `npm run build` as the build command and `dist` as the output directory. Before deploying, set `VITE_API_BASE_URL=https://secure-notes-api-sdr9.onrender.com` in the Vercel environment. The API's `FRONTEND_ORIGIN` should match the deployed frontend origin, which is `https://sec-notes.vercel.app` for this app.

## A quick walkthrough

1. Sign in as a regular user, create a note, edit it, and check that it appears in **My notes**.
2. Sign in as an admin and open **Users**, **All notes**, and **Interests**.
3. Open an author's public page, copy the link, and test it in a private browser window.

If the sign-in screen says it cannot reach the API, open the health link above and check the frontend API URL and backend allowed origin.
