---
title: Planning Poker Web Application Design Specification
version: 1.0
date_created: 2026-04-08
tags: design, app, angular, real-time, agile, planning-poker
---

# Introduction

This specification defines the design, requirements, and data contracts for a browser-based Planning Poker web application that replicates the collaborative estimation experience used in Agile teams. The application enables distributed or co-located teams to estimate the effort of user stories in real time without prior vote influence between participants.

## 1. Purpose & Scope

### Purpose

To define the design and behavioral requirements for a Planning Poker web application built with Angular. The application must support real-time multi-user sessions, card-based voting, vote revelation control, and basic session management.

### Scope

- **In scope**: Session creation and joining, user identity within a session, session mode selection (Story Mode or Free Round Mode), story queue management, card selection, vote reveal, round replay, and session statistics.
- **Out of scope**: Persistent user accounts, integration with project management tools (e.g., Jira, Linear), billing, and administrative dashboards.

### Audience

Frontend and backend developers building or extending this application. May also be used by AI coding agents generating implementation code.

### Assumptions

- The application is used in a modern evergreen browser (Chrome, Firefox, Edge, Safari).
- Sessions are ephemeral: data is not persisted beyond the lifetime of a session unless explicitly stated.
- All users within a session are trusted participants; no role-based access control beyond the Moderator role is required at this stage.

---

## 2. Definitions

| Term | Definition |
|---|---|
| **Session** | A named virtual room in which a Planning Poker game takes place. Identified by a unique Session ID. |
| **Room** | Synonym for Session in this document. |
| **Moderator** | The session facilitator. Has exclusive control over story management, vote reveal, and round reset. One per session. |
| **Team Member** | A participant who casts votes. Zero or more per session. |
| **Observer** | A participant who can see the session but cannot vote. Zero or more per session. |
| **Story** | A user story or task item presented to the team for estimation. Has a title and optional description. |
| **Voting Round** | A discrete estimation event for one Story. Consists of card selection, reveal, and optional replay. |
| **Card** | A discrete estimation value that a Team Member selects during a Voting Round. |
| **Voting Scale** | The ordered set of Card values available in a session (e.g., Fibonacci). |
| **Vote** | A single Team Member's selected Card for the current Voting Round. |
| **Consensus** | A state where all Team Members have selected the same Card value. |
| **Planning Poker** | An Agile estimation technique where team members simultaneously reveal their estimates to avoid anchoring bias. |
| **Anchoring Bias** | The cognitive bias where an initial value disproportionately influences subsequent estimates. |
| **Session Mode** | A configuration choice made at session creation that determines whether the session uses a story queue (Story Mode) or free-form rounds (Free Round Mode). Immutable after creation. |
| **Story Mode** | A session mode in which the Moderator manages a queue of Stories and each Voting Round is associated with a specific Story. |
| **Free Round Mode** | A session mode in which Voting Rounds are independent of Stories. The Moderator starts, reveals, and resets rounds freely without creating or managing Stories. |
| **Round Number** | A sequential integer (starting at 1) that identifies the current Voting Round in Free Round Mode. Incremented each time the round is reset. |
| **WebSocket** | A full-duplex communication protocol over a single TCP connection used for real-time updates. |
| **SPA** | Single-Page Application — an application that loads a single HTML page and dynamically updates content. |

---

## 3. Requirements, Constraints & Guidelines

### Functional Requirements

- **REQ-001**: The application shall allow a user to create a new Session and become the Moderator of that session.
- **REQ-002**: The application shall generate a unique, shareable Session URL upon session creation.
- **REQ-003**: The application shall allow any user with a valid Session URL to join the session as a Team Member or Observer.
- **REQ-004**: Team Members shall be able to select exactly one Card per active Voting Round.
- **REQ-005**: A Team Member shall be able to change their Card selection before the votes are revealed.
- **REQ-006**: All votes shall be hidden from all participants until the Moderator reveals them.
- **REQ-007**: The Moderator shall be able to reveal all votes simultaneously for the active Voting Round.
- **REQ-008**: Upon reveal, the application shall display each Team Member's vote alongside their name.
- **REQ-009**: The application shall display summary statistics after vote reveal: whether consensus was reached.
- **REQ-010**: The Moderator shall be able to reset the current Voting Round (clear all votes and re-enable card selection).
- **REQ-011**: The Moderator shall be able to mark a Story with a final estimate and advance to the next Story.
- **REQ-012**: The application shall display the list of all participants in the session and their current vote status (voted / not voted / observer).
- **REQ-013**: The application shall update all participants' views in real time when session state changes (votes cast, reveal, round reset, new story).
- **REQ-014**: The application shall support configurable Voting Scales, including at minimum: Fibonacci (1, 2, 3, 5, 8, 13, 21, ?, ∞, ☕) and T-Shirt Sizes (XS, S, M, L, XL, XXL).
- **REQ-015**: The Moderator shall be able to set the Voting Scale when creating the session.
- **REQ-016**: An Observer role shall be available; Observers can join and view the session but cannot cast votes.
- **REQ-017**: The application shall handle a participant disconnecting and reconnecting gracefully, restoring their session state.
- **REQ-018**: The Moderator shall be able to transfer the Moderator role to another participant.
- **REQ-019**: When creating a session, the Moderator shall select a session mode (Story Mode or Free Round Mode) via a radio button control before the session is created.
- **REQ-020**: In Free Round Mode, the Moderator shall be able to reveal all votes and reset the round without creating or selecting a Story.
- **REQ-021**: In Free Round Mode, the story queue, story management controls (add story, set active story, finalize story), and story-related UI shall not be rendered.
- **REQ-022**: The session mode shall be immutable after the session is created; it cannot be changed mid-session.
- **REQ-023**: In Free Round Mode, the session shall track a sequential round number (starting at 1) that increments each time the round is reset, providing context for participants.

### Security Requirements

- **SEC-001**: Session IDs shall be 6-digit numeric codes (000000–999999), randomly generated. Because the space is small (~10^6 combinations), the server **must** enforce rate limiting on session join attempts (e.g., maximum 10 failed attempts per minute per IP) to prevent enumeration attacks. Sessions shall expire promptly when all participants leave.
- **SEC-002**: User-supplied input (story titles, descriptions, user names) shall be sanitized before display to prevent XSS attacks.
- **SEC-003**: The application shall not expose any other session's data through its API or WebSocket channel.
- **SEC-004**: WebSocket connections shall be authenticated to the session they belong to.

### Constraints

- **CON-001**: The frontend shall be implemented as an Angular SPA.
- **CON-002**: Real-time communication shall use WebSockets or a WebSocket-compatible abstraction (e.g., Socket.io, Firebase Realtime Database).
- **CON-003**: The application shall function in all modern evergreen browsers without plugins or extensions.
- **CON-004**: Sessions are ephemeral by default; data need not persist beyond the session unless optional persistence is implemented.
- **CON-005**: The application shall be usable without a user account or login; identity is established by entering a display name when joining.

### Guidelines

- **GUD-001**: Card selections shall be hidden using a visual "face-down" card metaphor to reinforce the simultaneous reveal mechanic.
- **GUD-002**: Participant vote status (voted / not voted) shall be visible before reveal, but not the selected value.
- **GUD-003**: The UI shall be mobile-first and fully responsive across all viewport sizes and breakpoints, from small phones (minimum viewport width: 320px) through tablet, desktop, and wide-screen displays.
- **GUD-004**: Color alone shall not be used as the sole indicator of state; use icons or labels in addition to color for accessibility.
- **GUD-005**: All interactive elements shall be keyboard-accessible.

### Patterns

- **PAT-001**: Use Angular component architecture — one component per discrete UI concern (card selector, participant list, story queue, results panel).
- **PAT-002**: Centralize session state in a dedicated Angular service, not in individual components.
- **PAT-003**: Use reactive patterns (RxJS Observables or Angular Signals) to propagate real-time state changes throughout the UI.

---

## 4. Interfaces & Data Contracts

### 4.1 Domain Models

#### Session

```typescript
interface Session {
  id: string;             // Cryptographically random UUID
  name: string;           // Human-readable session name
  moderator_id: string;
  voting_scale: VotingScale;
  session_mode: 'stories' | 'free';  // Set at creation; immutable thereafter
  status: 'waiting' | 'voting' | 'revealed';
  current_story_id: string | null;   // Always null in Free Round Mode
  round_number: number;              // Increments on reset; always 1 at session start
  stories: Story[];                  // Always empty in Free Round Mode
  participants: Participant[];
  created_at: string;     // ISO 8601
}
```

#### Participant

```typescript
interface Participant {
  id: string;             // UUID assigned on join
  display_name: string;
  role: 'moderator' | 'team_member' | 'observer';
  is_connected: boolean;
  has_voted: boolean;     // True when a vote has been cast; value is hidden until reveal
}
```

#### Story

```typescript
interface Story {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'active' | 'estimated';
  final_estimate?: string;   // Null until Moderator finalizes
}
```

#### Vote

```typescript
interface Vote {
  participant_id: string;
  story_id: string | null;  // Null in Free Round Mode
  round_number: number;     // Always set; used to scope votes to the current round
  card_value: string;    // e.g., "5", "13", "?", "☕"
  submitted_at: string;  // ISO 8601
}
```

#### VotingScale

```typescript
type VotingScaleId = 'fibonacci' | 'tshirt' | 'custom';

interface VotingScale {
  id: VotingScaleId;
  name: string;
  cards: string[];  // Ordered array of card values
}

// Predefined scales
const FIBONACCI_SCALE: VotingScale = {
  id: 'fibonacci',
  name: 'Fibonacci',
  cards: ['1', '2', '3', '5', '8', '13', '21', '?', '∞', '☕']
};

const TSHIRT_SCALE: VotingScale = {
  id: 'tshirt',
  name: 'T-Shirt Sizes',
  cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?']
};
```

#### Round Result

```typescript
interface RoundResult {
  story_id: string | null;  // Null in Free Round Mode
  round_number: number;
  votes: { participant_id: string; display_name: string; card_value: string }[];
  average: number | null;   // Null if non-numeric cards were cast
  median: number | null;
  consensus: boolean;
  consensus_value: string | null;
}
```

### 4.2 WebSocket Events

All events are JSON-encoded. The `type` field identifies the event.

#### Client → Server Events

| Event Type | Payload | Description |
|---|---|---|
| `join_session` | `{ session_id, display_name, role }` | Join an existing session |
| `create_session` | `{ name, voting_scale_id, session_mode, display_name }` | Create a new session |
| `add_story` | `{ session_id, title, description? }` | Moderator adds a story to the queue (Story Mode only) |
| `set_active_story` | `{ session_id, story_id }` | Moderator sets the active story (Story Mode only) |
| `cast_vote` | `{ session_id, story_id?, card_value }` | Team Member casts a vote (`story_id` omitted in Free Round Mode) |
| `reveal_votes` | `{ session_id }` | Moderator reveals all votes |
| `reset_round` | `{ session_id }` | Moderator clears all votes for current story |
| `finalize_story` | `{ session_id, story_id, final_estimate }` | Moderator finalizes a story estimate |
| `transfer_sm` | `{ session_id, new_sm_id }` | Moderator transfers their role |

#### Server → Client Events

| Event Type | Payload | Description |
|---|---|---|
| `session_state` | `Session` | Full session state (sent on join and reconnect) |
| `participant_joined` | `Participant` | A new participant has joined |
| `participant_left` | `{ participant_id }` | A participant disconnected |
| `participant_reconnected` | `{ participant_id }` | A participant reconnected |
| `vote_cast` | `{ participant_id }` | A vote was cast (value hidden) |
| `votes_revealed` | `RoundResult` | Votes are now revealed |
| `round_reset` | `{ round_number }` | Votes cleared; new round number broadcast to all participants |
| `story_added` | `Story` | A new story was added to the queue (Story Mode only) |
| `active_story_changed` | `{ story_id }` | A different story is now active (Story Mode only) |
| `story_finalized` | `Story` | A story received a final estimate (Story Mode only) |
| `sm_transferred` | `{ new_sm_id }` | Moderator role transferred |
| `error` | `{ code, message }` | An error occurred |

### 4.3 REST API Endpoints (Minimal)

These endpoints support initial session setup where a WebSocket handshake requires an HTTP exchange.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create a new session; accepts `{ name, voting_scale_id, session_mode, display_name }`; returns `{ session_id, join_url }` |
| `GET` | `/api/sessions/:id` | Returns public session metadata (name, scale, session_mode, participant count) |

---

## 5. Acceptance Criteria

- **AC-001**: Given a user visits the application root, when they provide a session name, display name, and voting scale, then a new session is created and the user is redirected to a unique session URL as Moderator.
- **AC-002**: Given a session URL is shared, when a second user opens that URL and provides a display name, then they join the session as Team Member and all existing participants see them appear in the participant list immediately.
- **AC-003**: Given a Voting Round is active and a Team Member selects a card, then their participant status changes to "voted" for all other participants but the selected card value is not visible to anyone.
- **AC-004**: Given all Team Members have voted, when the Moderator reveals votes, then all card values are simultaneously shown to all participants along with average, median, and consensus status.
- **AC-005**: Given votes are revealed and no consensus was reached, when the Moderator resets the round, then all vote values are cleared and all participants can select a new card.
- **AC-006**: Given a participant disconnects from the session, when they return to the session URL, then their participant entry is restored and they can continue participating.
- **AC-007**: The system shall display each participant's vote status (voted / not voted) in real time without requiring a page refresh.
- **AC-008**: Given a Moderator finalizes a story, when the next story is set as active, then a new clean Voting Round begins for all participants.
- **AC-009**: Non-numeric card selections (?, ∞, ☕) shall be excluded from average and median calculations; consensus detection shall still function with mixed or non-numeric cards.
- **AC-010**: Given a participant joins as an Observer, then the card selector is not rendered for that participant, and they are excluded from vote status tracking.
- **AC-011**: Given a user is creating a session, when the session creation form is displayed, then a radio button control allows the user to select either Story Mode or Free Round Mode before creating the session.
- **AC-012**: Given a session is created in Free Round Mode, when the room is viewed by any participant, then no story queue, add-story form, set-active-story control, or finalize-story control is rendered; only the card selector, participant list, results panel, and round controls (reveal, reset) are shown.
- **AC-013**: Given a session is in Free Round Mode and votes are revealed, when the Moderator resets the round, then the round number increments by one and all participants see the updated round number with a fresh voting state.
- **AC-014**: Given a session is created in Story Mode, then Free Round Mode controls (bare round number) are not shown and the full story queue workflow applies as per existing acceptance criteria.

---

## 6. Test Automation Strategy

- **Test Levels**: Unit (Angular services and components), Integration (WebSocket event handling), End-to-End (multi-user session flows).
- **Frameworks**: Jasmine/Karma (unit), Angular Testing Library (component), Playwright or Cypress (E2E).
- **Test Data Management**: Tests create ephemeral in-memory sessions; no external state required.
- **CI/CD Integration**: All unit and integration tests run on every pull request; E2E tests run on merge to main branch.
- **Coverage Requirements**: Minimum 80% line coverage for Angular services; component tests cover all user-visible state transitions.
- **Key E2E Scenarios**:
  - Two-user flow: create session → join → vote → reveal → finalize story.
  - Reconnection flow: participant disconnects mid-round → reconnects → state is restored.
  - Observer flow: observer joins and cannot vote.
  - Moderator transfer flow: Moderator transfers role and new Moderator can control the session.

---

## 7. Rationale & Context

### Simultaneous Reveal

Votes are hidden until the Moderator explicitly reveals them to eliminate anchoring bias. If votes were visible as cast, early voters would influence later voters, defeating the purpose of independent estimation.

### Ephemeral Sessions

Session data is not persisted by default because Planning Poker is a synchronous, real-time activity. Persisting data adds infrastructure complexity without meaningful benefit for the core use case.

### No Login Required

Requiring user accounts creates friction that would impede adoption. Display-name-only identity is sufficient for the time-bounded scope of a Planning Poker session.

### Angular as Frontend Framework

Angular was selected as the frontend framework for the project and provides strong component isolation, dependency injection for services, and native support for RxJS — which is well-suited to modeling event streams from a WebSocket.

### Configurable Voting Scales

Teams use different estimation scales. Fibonacci is most common, but T-Shirt sizes are often preferred by less technical stakeholders. A configurable scale avoids forcing teams to adapt to a fixed system.

### Backend Server Requirement

This application requires a backend server. A frontend-only architecture is not viable for the following reasons:

- **Vote confidentiality**: A client cannot be trusted to hold vote values and conceal them. Browser DevTools, network inspection, or modified JavaScript would expose hidden values. The server must be the sole holder of uncast votes until reveal is triggered.
- **Real-time state authority**: Multiple browser clients require a single authoritative source of truth for session state. Without a server, no reliable mechanism exists for broadcasting events (vote cast, reveal, round reset) to all connected participants simultaneously.
- **Security enforcement**: Rate limiting on session join attempts (SEC-001) and WebSocket session authentication (SEC-004) can only be enforced server-side.

#### Selected Backend Tech Stack

**Node.js + Express + Socket.io** has been selected as the backend for this application.

- Express serves the minimal REST API (session creation and metadata lookup).
- Socket.io provides WebSocket communication with automatic fallback and built-in reconnection handling.
- Session state is held in an in-process `Map` — sufficient for single-instance ephemeral sessions.
- TypeScript is used throughout, consistent with the Angular frontend.

---

## 8. Dependencies & External Integrations

### Technology Platform Dependencies

- **PLT-001**: Angular (latest stable) — SPA framework for the frontend application.
- **PLT-002**: Node.js runtime — Runs both the Angular build toolchain and the Express/Socket.io backend server.
- **PLT-003**: Express — HTTP server framework for the Node.js backend; serves the REST API and static Angular bundle.
- **PLT-004**: Socket.io — WebSocket library with automatic fallback and built-in reconnection; used for all real-time session communication.

### Infrastructure Dependencies

- **INF-001**: Static file hosting — The Express server serves the compiled Angular SPA bundle directly, eliminating the need for a separate static host.
- **INF-002**: Socket.io server — Runs within the same Node.js process as the Express API; maintains persistent Socket.io connections for the duration of each session.
- **INF-003**: In-memory session store — Session state is held in a `Map` within the Node.js process. Sufficient for a single-instance deployment given sessions are ephemeral.

### Third-Party Services

- **SVC-001**: No third-party real-time service is required. Real-time communication is handled by Socket.io running within the Node.js backend.

---

## 9. Examples & Edge Cases

### Example: Fibonacci Round with Mixed Cards

```json
// All votes cast — awaiting reveal
{
  "votes": [
    { "participant_id": "u1", "display_name": "Alice", "card_value": "5" },
    { "participant_id": "u2", "display_name": "Bob",   "card_value": "8" },
    { "participant_id": "u3", "display_name": "Carol", "card_value": "?" },
    { "participant_id": "u4", "display_name": "Dave",  "card_value": "5" }
  ]
}

// RoundResult after reveal
{
  "story_id": "story-42",
  "votes": [ /* same as above */ ],
  "average": 6.0,        // (5 + 8 + 5) / 3 — "?" excluded from numeric calculation
  "median": 5.5,         // median of [5, 5, 8]
  "consensus": false,
  "consensus_value": null
}
```

### Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Moderator casts a vote | Moderator may optionally vote as a Team Member; if so, their vote is treated like any other. |
| Only one Team Member in session | Reveal is available immediately; consensus is always true. |
| All participants voted with `?` | Average and median are null; consensus is true with value `?`. |
| Moderator disconnects mid-round | A countdown timer of 60 seconds begins; if Moderator does not reconnect, Moderator role is transferred to the longest-connected Team Member. |
| Session URL accessed after all participants have left | A new participant can still join; the session state is preserved while the server holds it in memory. |
| Participant joins during vote reveal state | They join and immediately see the revealed votes. |
| Story queue is empty and Moderator clicks "next" | The application enters a "waiting for stories" state; voting is disabled until a story is added. |
| Session is in Free Round Mode and Moderator resets the round | Round number increments; all votes are cleared; all participants can select a new card. Round number is broadcast to all connected clients via `round_reset`. |
| Participant joins a Free Round Mode session mid-round | They receive full session state including the current `round_number` and existing vote statuses; they may cast a vote for the current round. |
| Participant joins a Free Round Mode session during reveal | They join and immediately see the revealed votes and current `round_number`. |

---

## 10. Validation Criteria

- [ ] A session can be created and joined from two separate browser windows simultaneously.
- [ ] Votes cast in one browser are reflected as "voted" (without the value) in all other browsers within 500ms.
- [ ] Vote values remain hidden until the Moderator triggers reveal.
- [ ] Reveal updates all connected browsers simultaneously with correct values, average, median, and consensus.
- [ ] A round reset clears all votes and re-enables card selection for all participants.
- [ ] A participant who closes and reopens their browser tab rejoins the session at the same URL and their state is restored.
- [ ] Non-numeric card values (?, ∞, ☕) are excluded from numeric statistics without causing errors.
- [ ] An Observer cannot cast a vote.
- [ ] Session IDs contain sufficient entropy that brute-force guessing is computationally infeasible.
- [ ] All user-supplied input is rendered safely; injected HTML or script tags are not executed.
- [ ] When creating a session, a radio button allows selection of Story Mode or Free Round Mode; the chosen mode is reflected in the session state returned by the server.
- [ ] In Free Round Mode, the story queue and story management UI are not rendered for any participant.
- [ ] In Free Round Mode, the round number increments from 1 to 2 after the first reset and is visible to all participants.
- [ ] In Free Round Mode, participants can vote, the Moderator can reveal, and the Moderator can reset without any story being present.

---

## 11. Related Specifications / Further Reading

- [RFC 6455 — The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [Angular Architecture Guide](https://angular.dev/guide/overview)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Planning Poker — Mountain Goat Software](https://www.mountaingoatsoftware.com/agile/planning-poker)
