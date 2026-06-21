# Horizons Nexus

A SvelteKit app for the **YSWS – Horizons Nexus** program. Hackers sign in with
Hack Club and ship their project; submissions are written to the
*YSWS – Horizons Nexus* Airtable base.

Screens, matching the [Podium UI Figma](https://www.figma.com/design/RW0SS1Fy72M9tLil5nk400/Podium-UI2):

- `/` — sign-in landing page ("Sign in with Hack Club")
- `/ship/team` — **step 1**, team members (auth-gated)
- `/ship` — **step 2**, the "Ship your project" form
- `/ship/cards` — **step 3**, add your poker cards + a photo

The three steps are one flow: signing in lands on `/ship/team`. Team members are
held in a signed "draft" cookie; the Airtable record is created at the `/ship`
step (with the team), then augmented with the cards at `/ship/cards`.

On the team step, teammates are searched by **Slack username** via a typeahead
that filters a cached copy of the Horizons attendee directory (a separate base,
read with `HORIZONS_AIRTABLE_TOKEN`). On submit the app also writes a **`Teams`**
table row (generated `Team ID`, members, and a link to the project) and stamps
the same `Team ID` on the submission — so teams ↔ projects are cross-referenced.

## Tech

- SvelteKit (Svelte 5 runes) + TypeScript, plain scoped CSS
- Hack Club Auth (`auth.hackclub.com`) — OAuth 2.0 authorization-code flow
- Airtable Web API for submissions (record create + screenshot attachment upload)
- Signed, HTTP-only session cookie (HMAC-SHA256)

## Setup

1. **Install deps**

   ```sh
   npm install
   ```

2. **Register a Hack Club OAuth app** at <https://auth.hackclub.com/developer/apps>.
   Set the redirect URI to `http://localhost:5173/auth/callback` (and your prod URL).
   You'll get a `client_id` and `client_secret`.

3. **Create an Airtable token** at <https://airtable.com/create/tokens> with the
   `data.records:write` scope and access to the *YSWS – Horizons Nexus* base.

4. **Configure env** — copy `.env.example` to `.env` and fill in:

   ```sh
   cp .env.example .env
   # then set AUTH_CLIENT_ID, AUTH_CLIENT_SECRET, SESSION_SECRET, AIRTABLE_TOKEN
   ```

   Generate a session secret with `openssl rand -hex 32`.

5. **Run**

   ```sh
   npm run dev
   ```

   In dev, a **"Dev login (skip OAuth)"** link appears on the home page so you can
   preview the authenticated `/ship` flow without real credentials. This route
   (`/auth/dev-login`) only exists in dev builds.

## How submissions map to Airtable

The `/ship` form writes a record to the **YSWS Project Submission** table:

| Form field            | Airtable field                  |
| --------------------- | ------------------------------- |
| Team Members (step 1) | Team Members                    |
| Project Name          | Project Name                    |
| Github Repo Link      | Code URL                        |
| Playable Link         | Playable URL                    |
| Screenshot            | Screenshot (attachment)         |
| Project Description   | Description (rich text)         |
| Estimated Hours Spent | Optional - Override Hours Spent |
| How did you hear about this? | How did you hear about this?    |
| What are we doing well? | What are we doing well?          |
| How can we improve? | How can we improve?                  |
| Cards (step 3)        | Cards (space-separated codes)   |
| Photo of your cards (step 3) | Cards Photo (attachment) |
| _(from Hack Club)_    | First Name, Last Name, Email    |
| _(parsed from repo)_  | GitHub Username                 |
| _(from Hack Club)_    | Address (Line 1/2), City, State / Province, ZIP / Postal Code, Country, Birthday |

Every writable column in the table is now covered. The only fields left unset
are system-managed ones (`Automation - *` and the `Loops - *` formulas).

> **Address & birthday** are pulled from the verified Hack Club identity at
> sign-in using the **privileged `address` + `birthdate` scopes**, which Hack
> Club HQ only grants to approved YSWS programs. Until your OAuth app is upgraded
> to HQ-official tier, `/authorize` returns `invalid_scope` — get the app
> approved to enable sign-in (and the address/birthday fields).

## Project layout

```
src/
  app.css                       global tokens + Phantom Sans @font-face
  hooks.server.ts               reads the session cookie into locals.user
  lib/
    cards.ts                    Balatro card catalogue + resolver (from nexus_cards_html)
    components/Backdrop.svelte  layered, cover-scaled Figma background
    server/
      auth.ts                   Hack Club OAuth helpers
      airtable.ts               Airtable create/update + attachment upload + Teams
      draft.ts                  signed cookie carrying the in-progress submission
      horizons.ts               cached Horizons attendee directory (Slack search)
      session.ts                signed-cookie session
  routes/
    +page.svelte                home / sign-in
    ship/team/                  step 1 — team members (Slack-username typeahead)
    ship/team/search/           directory search endpoint (JSON)
    ship/                       step 2 — project form (creates record + Teams row)
    ship/cards/                 step 3 — cards + photo
    auth/login | callback | logout | dev-login
static/art/                     Figma background art + Nexus logo
static/cards/                   52 Balatro card sprites (<frame>.png)
```

## Notes

- **Fonts:** Phantom Sans 0.8 is loaded from `assets.hackclub.com` to match the
  Figma. It falls back to a system sans stack if the CDN is unavailable.
- Background art is downscaled decorative PNGs in `static/art/`.
