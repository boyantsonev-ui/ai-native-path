# AI-Native Builder

A self-improving course on building with Claude, AI agents, MCP, and deploy/measure workflows.

**Live:** [ai-native-path.vercel.app](https://ai-native-path.vercel.app)

---

## Running locally

```bash
npx serve -p 4200 .
```

Open `http://localhost:4200`. No build step — JSX is compiled in the browser via Babel standalone.

---

## Project structure

| File | Purpose |
|---|---|
| `app.jsx` | Shell, sidebar, routing, progress state, auth |
| `components.jsx` | All reusable components + SVG diagrams |
| `styles.css` | Single stylesheet — all tokens and component styles |
| `lessons-1.jsx` | Lessons 1–4 (Intro + Tools) |
| `lessons-2.jsx` | Lessons 5–9 (Foundations + Wiring) |
| `lessons-3.jsx` | Lessons 10–11 (Ship) |
| `lessons-4.jsx` | Lessons 12–13 (Measure + Wrap-up) |
| `lessons-5.jsx` | Lesson 14 (Meta — course architecture) |
| `glossary.jsx` | GlossaryModal + CheatSheetModal |
| `feedback.jsx` | FeedbackPanel, AdminDashboard, HITL logic |
| `api/synthesize.js` | Vercel serverless — weekly synthesis via Claude API |
| `api/apply.js` | Vercel serverless — approved proposals → GitHub PR |

See `DESIGN.md` for the full component catalogue, token system, and design rationale.

---

## Adding a lesson

1. Pick the right `lessons-N.jsx` (or create `lessons-6.jsx` for overflow)
2. Write `const LessonN = () => ( ... )` using components from `components.jsx`
3. Export it: add to `Object.assign(window, { ... })` at the bottom of that file
4. Register it in the `LESSONS` array in `app.jsx`

---

## Environment variables

Set these in Vercel → Project Settings → Environment Variables (and locally in `.env.local`):

| Variable | Where used |
|---|---|
| `ANTHROPIC_API_KEY` | `api/synthesize.js`, `api/apply.js`, `feedback.jsx` (TryIt blocks) |
| `GITHUB_TOKEN` | `api/apply.js` — opens PRs on your repo |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/synthesize.js`, `api/apply.js` — server-side Supabase writes |

Supabase anon key and project URL are inlined in `app.jsx` (public — safe for client).

---

## Google Sign-In setup (optional)

The course works fully without auth — progress is stored in localStorage. Google Sign-In enables cross-device sync via Supabase.

**Step 1 — Supabase dashboard**

1. Go to Authentication → Providers → Google → Enable
2. Copy the **Callback URL** shown (you'll need it in step 2)

**Step 2 — Google Cloud Console**

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)
2. Authorised JavaScript origins: `https://ai-native-path.vercel.app` + `http://localhost:4200`
3. Authorised redirect URIs: paste the Supabase Callback URL from step 1
4. Copy the **Client ID** and **Client Secret**

**Step 3 — Back in Supabase**

Paste the Client ID and Client Secret into the Google provider settings and save.

**Step 4 — Run the migration**

In the Supabase SQL editor, run:

```
supabase/migrations/20260526_user_progress.sql
```

That's it. The `AuthButton` component in the sidebar footer activates automatically once Google is enabled.

---

## The self-improving loop

Learners submit ratings and questions via the feedback panel at the bottom of each lesson. Responses are stored in Supabase. When unread feedback crosses 10 items (or on the Thursday noon cron), `api/synthesize.js` clusters it into ranked proposals. A human reviews them in the admin dashboard (click the brand logo 5× to open). Approved proposals trigger `api/apply.js`, which commits the change and opens a GitHub PR.

See Lesson 14 for the full architecture walkthrough.

---

## Deploying

```bash
vercel deploy --prod --yes
```

Auto-deploy on push is not configured — trigger manually or wire up a GitHub Action.
