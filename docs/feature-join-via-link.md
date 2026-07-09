# Feature Plan: Join Session via Shareable Link

> Status: **Awaiting implementation** — plan approved, no code changes started.
> Date: 2026-07-09

## Overview

Let anyone who opens a room URL (`/room/:id`) directly see a **join gate** before entering the room:

1. Choose a display name **or** join as an anonymous user (`Anonymous #NNNN`).
2. Choose to join as a **Participant** (can vote) or a **Spectator** (observer, cannot vote).

Returning users (page refresh) reconnect silently and never see the gate. The room URL itself is the shareable invite link; a "Copy link" button is added to the room header.

**Vote secrecy clarification (no change expected):** the server never emits card values before reveal (`toClientState` excludes votes), and the participant list only renders ✓ / … status — this only needs verification.

## Agreed decisions

| Question                             | Decision                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| Where does the join screen live?     | **Gate inside `/room/:id`** — no separate `/join` route; URL stays the invite link |
| Anonymous display name               | **`Anonymous #NNNN`** — random 4-digit suffix, generated client-side               |
| Copy invite link button              | **Yes** — added next to the existing copy-code button in the room header           |
| Returning users (stored participant) | **Silent reconnect** — skip the gate when `sessionStorage` has a matching ID       |

## Current-state findings

- **Frontend** (`planning-poker`, Angular standalone components + signals):
  - Routes in `src/app/app.routes.ts`: `''` → Home, `room/:id` → Room.
  - `src/app/room/room.ts` `ngOnInit` currently auto-joins with the hardcoded name `"Returning User"` when `session()` is null — this is the code the gate replaces.
  - `src/app/shared/session.service.ts` — `joinSession(session_id, display_name, role)` already supports `'team_member' | 'observer'`; reconnect `participant_id` is read from `sessionStorage` key `pp_participant`; `waitForSession()` navigates to `/room/:id` on `session_state`.
  - `src/app/home/home.ts` / `home.html` — existing join form (name input, observer checkbox, error/notice display, `isConnecting` from `SocketService.connectionStatus`) is the pattern to reuse for the gate.
  - `environment.serverUrl` = `http://localhost:3000` for HTTP calls.
  - `public/staticwebapp.config.json` already has `navigationFallback` → deep links to `/room/:id` work in production.
- **Backend** (`planning-poker-service`, Express + Socket.IO): **no changes required.**
  - `join_session` handler in `src/socket/handlers.ts` already supports `role: 'observer'` and the reconnect path (existing `participant_id`).
  - `GET /api/sessions/:id` in `src/routes/sessions.ts` returns public metadata (name, participant_count, status) — used by the gate for pre-join display and invalid-link detection (404).

## Implementation steps

### Phase 1 — Join gate in Room component (frontend only)

1. **`src/app/room/room.ts`** — replace the hardcoded auto-join in `ngOnInit` with a three-way branch:
   - `session()` already set → came from Home; show the room as today.
   - `sessionStorage` `pp_participant` matches this session id → silent reconnect via existing `joinSession` reconnect path (server ignores the display name on reconnect).
   - Otherwise → show the join gate and fetch `GET /api/sessions/:id` for the session name; a 404 renders a "Session not found" state with a link back to Home.
2. Add gate form state: display name, "Join anonymously" checkbox (auto-fills `Anonymous #<1000-9999>` and disables the name input), role radio — Participant (`team_member`) vs Spectator (`observer`).
3. **`src/app/room/room.html`** — Bootstrap card shown instead of the board until joined, reusing the join-form patterns from `home.html` (error display, connecting state).
4. On submit → `sessionService.joinSession(id, name, role)`; the gate disappears when `session_state` arrives (`session()` becomes non-null). Verify `waitForSession()`'s navigation to `/room/:id` is a no-op when already on that route.
5. Optionally expose a connecting computed in `session.service.ts` (mirroring `home.ts`) — no protocol changes.

### Phase 2 — Copy invite link

6. **`src/app/room/room.ts` / `room.html`** — add a "Copy link" button next to the existing `copyCode()`, copying `${location.origin}/room/${session.id}` via `navigator.clipboard`.

### Phase 3 — Verification & polish

7. Confirm `waitForSession()` causes no redundant navigation when joining from within the room route.
8. Verify vote secrecy needs no change: `toClientState` in `session-store.ts` excludes votes; `participant-list.html` renders only `has_voted` status.

## Files

| File                                               | Change                                                 |
| -------------------------------------------------- | ------------------------------------------------------ |
| `planning-poker/src/app/room/room.ts`              | Gate logic, three-way join branch, copy-link           |
| `planning-poker/src/app/room/room.html`            | Gate UI, "Session not found" state, copy-link btn      |
| `planning-poker/src/app/room/room.scss`            | Gate styling (if needed)                               |
| `planning-poker/src/app/shared/session.service.ts` | Optionally expose connecting state; no protocol change |
| `planning-poker-service/*`                         | **No changes**                                         |

## Verification

1. Run both apps (`npm start` frontend, `npm run dev` backend). Create a session in one browser, copy the invite link, open it in an incognito window → gate appears with the session name.
2. Join as Participant → can vote. Join as Spectator → 👁 badge, no voting cards.
3. Check "Join anonymously" → name becomes `Anonymous #NNNN`.
4. Refresh the room page → silent reconnect, no gate shown.
5. Open `/room/badcode` → "Session not found" message with link home.
6. While voting, other clients only ever see ✓ / … per participant, never card values.
7. `npm test` in `planning-poker` passes.
