# Secure Notes web client

Minimal React + Vite UI for the Express API. Requires Node.js 24 and a running backend.

1. Run `npm ci`.
2. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
3. Run `npm run dev` and open http://localhost:5173.
4. Use `npm run build` for the production build.

On Vercel, use the Vite preset with `dist` output and configure `VITE_API_BASE_URL` before deploying. Set the backend's `FRONTEND_ORIGIN` to the deployed site's exact origin.

Sign in with a backend-seeded account. Regular users have My notes and public posts. Admins also have All notes, Users and Interests. Public posts can be viewed without an account through `/?author=<ObjectId>`. The access token lives in memory, so reloading the page requires signing in again.
