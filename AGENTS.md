# Planning Poker — Frontend (Angular)

Real-time planning poker web app. This is the Angular frontend; the backend lives in the sibling workspace folder `planning-poker-service` (Express + Socket.IO, in-memory state). Full product design: [spec/spec-design-planning-poker-web-app.md](spec/spec-design-planning-poker-web-app.md).

## Commands

- `npm start` — dev server at http://localhost:4200 (expects backend on http://localhost:3000)
- `npm run build` — **defaults to production** (swaps `environment.ts` → `environment.prod.ts`)
- `npm test` — **Vitest** via `@angular/build:unit-test` builder with jsdom (not Karma/Jasmine)
- No lint script; Prettier is available as a devDependency

## Architecture

- Angular 21, **standalone components only** (no NgModules), **zoneless** (no zone.js), new control flow (`@if`/`@for` with `track`) in all templates.
- Routes ([src/app/app.routes.ts](src/app/app.routes.ts)): `''` → Home, `room/:id` → Room, `**` → redirect. Eager-loaded.
- **All app state lives in `SessionService` signals** ([src/app/shared/session.service.ts](src/app/shared/session.service.ts)): `session`, `myParticipantId`, `lastResult`, `error`, `notice` + computed `me`, `isModerator`, `currentStory`. It subscribes to all socket events and applies immutable `signal.update()` changes. No NgRx — don't introduce a state library.
- `SocketService` ([src/app/shared/socket.service.ts](src/app/shared/socket.service.ts)) wraps socket.io-client (`autoConnect: false`) and exposes a `connectionStatus` signal.
- Domain types shared across components live in [src/app/shared/types.ts](src/app/shared/types.ts) — keep them in sync with the backend's `src/types.ts`.
- Participant identity is persisted in `sessionStorage` under key `pp_participant` for silent reconnect.

## Conventions

- File names are **suffix-less**: `room.ts` / `room.html` / `room.scss` (not `room.component.ts`); class names keep the `Component` suffix (`RoomComponent`). Selector prefix `app-`.
- **Constructor injection** is the prevailing DI style — match it rather than `inject()`.
- Components expose service signals as readonly fields assigned in the constructor (`readonly session = this.sessionService.session`).
- Signal-based inputs/outputs: `input.required()`, `output()`.
- Styling: per-component SCSS via `styleUrl` + Bootstrap 5.3; global styles in [src/styles.scss](src/styles.scss). Dark mode via `ThemeService` signal.

## Pitfalls

- The `sm_` prefix in socket events (`transfer_sm`, `sm_transferred`) is legacy "Scrum Master" naming for what the UI calls "moderator" — do not rename on one side only.
- Vote values are never present in `SessionState`; they only arrive via the `votes_revealed` event.
- `room.ts` makes one relative REST call (`/api/sessions/:id`) that bypasses `environment.serverUrl` — it only works same-origin or behind a proxy.
- Feature plans in [docs/](docs/) ([join via link](docs/feature-join-via-link.md), [remove participants](docs/feature-remove-participants.md)) may be ahead of or behind the code — verify against the source before assuming either is current.

## Deployment

Azure Static Web Apps (SPA fallback in [public/staticwebapp.config.json](public/staticwebapp.config.json)); backend is a separate Azure App Service configured in [src/environments/environment.prod.ts](src/environments/environment.prod.ts).
