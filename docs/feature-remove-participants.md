# Feature Plan: Moderator Participant Removal + Automatic Inactivity Cleanup

> Status: **Awaiting review** — no implementation started.
> Date: 2026-07-09

## Overview

Two related capabilities:

1. **Manual removal** — the session moderator can remove (kick) any participant from the session.
2. **Automatic cleanup** — the server prunes participants who stay disconnected too long, and expires idle/abandoned sessions sooner.

## Agreed decisions

| Question                                    | Decision                                                           |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Can a removed participant rejoin?           | **Yes** — kick only, no ban list; they rejoin as a new participant |
| Auto-remove disconnected participants after | **15 minutes**                                                     |
| Session inactivity TTL                      | Shorten **24h → 4h**                                               |
| Empty-session expiry                        | Delete session **30 min after all participants disconnect**        |

## Current-state findings

- **Backend** (`planning-poker-service`): Express + Socket.IO with an in-memory `SessionStore`.
  - Moderator-only actions in `src/socket/handlers.ts` follow a consistent pattern: `sessionStore.getParticipantBySocket(socket.id)` → check `participant.role !== 'moderator'` → mutate store → `io.to(session.id).emit(...)`.
  - `src/session-store.ts` keeps `sessions` and `socketToParticipant` maps; a 30-minute interval deletes sessions inactive for 24h. `getSession()` bumps `last_activity`.
  - On disconnect, participants are only marked `is_connected: false` — **they are never removed**. A 60s timer auto-transfers the moderator role if the moderator stays disconnected.
- **Frontend** (`planning-poker`, Angular + signals):
  - `src/app/shared/session.service.ts` wires all socket events into signals and exposes action methods; `leaveSession()` clears state and navigates home.
  - `src/app/participant-list/` is display-only; `src/app/room/` hosts moderator controls.
  - Reconnect uses a `participant_id` persisted in `sessionStorage` (`pp_participant`).

## Implementation steps

### Phase 1 — Backend: manual removal

1. **`src/session-store.ts`** — add `removeParticipant(session, participant_id)`:
   - Delete the participant from `session.participants`.
   - Delete their vote from `session.votes`.
   - Delete their `socketToParticipant` mapping (if any).
   - Bump `last_activity`; return the removed participant (or `undefined`).
2. **`src/socket/handlers.ts`** — add `remove_participant` handler (mirrors `transfer_sm` pattern), payload `{ participant_id }`:
   - Errors: `NOT_IN_SESSION`, `FORBIDDEN` (non-moderator), `INVALID_INPUT` (self-removal), `NOT_FOUND`.
   - If the target has a live socket: emit `removed_from_session` to it, then force it out of the room via `io.sockets.sockets.get(socket_id)?.leave(session.id)`.
   - Broadcast `participant_removed { participant_id }` to the room.

### Phase 2 — Backend: automatic cleanup

3. **`src/types.ts`** — add `disconnected_at?: number` to `InternalParticipant`; set it in `disconnectSocket()`, clear it in `updateSocket()` (reconnect) and `addParticipant()`.
4. **`src/session-store.ts`** — rework cleanup:
   - Constants: `SESSION_TTL_MS = 4h`, `PARTICIPANT_PRUNE_MS = 15 min`, `EMPTY_SESSION_TTL_MS = 30 min`.
   - Run the sweep every **60 seconds** (instead of 30 minutes).
   - Prune participants with `disconnected_at` older than 15 min.
   - Delete a session when: inactive > 4h, **or** every participant is disconnected and `last_activity` > 30 min old.
   - Moderator edge case: if the pruned participant is the moderator, auto-transfer the role to a connected candidate (reuse `transferSM`).
5. **`src/index.ts`** — the sweep must broadcast `participant_removed` / `sm_transferred`, so move the interval out of the `SessionStore` constructor and drive it from `index.ts` where `io` is available (e.g. `sessionStore.cleanup()` returns the pruned/transferred/deleted results for broadcasting).

### Phase 3 — Frontend

6. **`src/app/shared/session.service.ts`**:
   - Handle `participant_removed`: filter the participant out of `session.participants`.
   - Handle `removed_from_session`: show a "You were removed by the moderator" notice, clear state, navigate home. Note: `leaveSession()` clears the error signal, so the notice must survive navigation — use router navigation state or a dedicated transient `notice` signal read by the home page.
   - Add `removeParticipant(participant_id)` action emitting `remove_participant`.
7. **`src/app/participant-list/participant-list.ts` / `.html`**:
   - New inputs: `isModerator`, `myParticipantId`; new output: `remove`.
   - Render a small ✕ button (`btn-outline-danger btn-sm`) on other participants' rows when the viewer is the moderator, with a `confirm()` guard.
8. **`src/app/room/room.ts` / `.html`** — pass the new inputs and wire `(remove)` → `sessionService.removeParticipant($event)`.

## New socket events

| Event                  | Direction              | Payload              | Purpose                                          |
| ---------------------- | ---------------------- | -------------------- | ------------------------------------------------ |
| `remove_participant`   | client → server        | `{ participant_id }` | Moderator kicks a participant                    |
| `participant_removed`  | server → room          | `{ participant_id }` | All clients drop the participant from their list |
| `removed_from_session` | server → kicked socket | `{}`                 | Kicked client shows notice and navigates home    |

## Verification

1. Multi-tab manual test: moderator (tab A) kicks participant (tab B) → B navigates home with notice, A's list updates; B can rejoin as a new participant.
2. Security: forged `remove_participant` from a non-moderator returns `FORBIDDEN`; non-moderators see no ✕ buttons.
3. Kick mid-vote → kicked participant's vote is removed; reveal shows correct results.
4. Auto-prune: temporarily lower `PARTICIPANT_PRUNE_MS` to seconds, disconnect a tab, observe the removal broadcast; pruning the moderator triggers role transfer.
5. Empty-session expiry: lower `EMPTY_SESSION_TTL_MS`, close all tabs, verify rejoin returns `SESSION_NOT_FOUND`.
6. `ng test` still passes.

## Out of scope

- Ban/block list (removed users may rejoin).
- Persistence changes (store remains in-memory).
- REST route changes (`routes/sessions.ts` untouched).

## Open considerations

1. **Removed-user notice UX** — preferred mechanism (router navigation state vs. transient signal) to be settled during implementation.
2. **Empty-session expiry aggressiveness** — a solo moderator who disconnects >30 min loses the session; acceptable per agreed decision, flag if this should be relaxed.
