import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionService } from '../shared/session.service';
import { ParticipantListComponent } from '../participant-list/participant-list';
import { CardSelectorComponent } from '../card-selector/card-selector';
import { PokerTableComponent } from '../poker-table/poker-table';
import { FormsModule } from '@angular/forms';
import { GateComponent } from '../gate/gate';

type GateState = 'checking' | 'reconnecting' | 'gate' | 'not-found';

@Component({
  selector: 'app-room',
  imports: [
    ParticipantListComponent,
    CardSelectorComponent,
    PokerTableComponent,
    FormsModule,
    RouterLink,
    GateComponent,
  ],
  templateUrl: './room.html',
  styleUrl: './room.scss',
})
export class RoomComponent implements OnInit {
  readonly menuOpen = signal(false);
  readonly copyNotice = signal('');

  readonly session;
  readonly me;
  readonly isModerator;
  readonly currentStory;
  readonly lastResult;
  readonly error;
  readonly isConnecting;

  // SM story form
  newStoryTitle = '';
  finalEstimate = '';

  // Join gate
  readonly gateState = signal<GateState>('checking');
  readonly gateSessionName = signal<string | null>(null);

  private sessionId = '';

  constructor(
    private route: ActivatedRoute,
    readonly sessionService: SessionService,
  ) {
    this.session = sessionService.session;
    this.me = sessionService.me;
    this.isModerator = sessionService.isModerator;
    this.currentStory = sessionService.currentStory;
    this.lastResult = sessionService.lastResult;
    this.error = sessionService.error;
    this.isConnecting = sessionService.isConnecting;
  }

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('id') ?? '';

    // Came from Home (already joined) — nothing to do, room renders as-is.
    if (this.session() || !this.sessionId) return;

    // Returning participant (page refresh) — reconnect silently, skip the gate.
    if (this.sessionService.hasStoredParticipant(this.sessionId)) {
      this.gateState.set('reconnecting');
      this.sessionService.joinSession(this.sessionId, '');
      return;
    }

    // New visitor via invite link — show the join gate.
    this.sessionService.getSessionPreview(this.sessionId).subscribe({
      next: (preview) => {
        this.gateSessionName.set(preview.name);
        this.gateState.set('gate');
      },
      error: () => this.gateState.set('not-found'),
    });
  }

  onGateJoin(payload: { displayName: string; role: 'team_member' | 'observer' }): void {
    this.sessionService.joinSession(this.sessionId, payload.displayName, payload.role);
  }

  onCardPicked(card: string): void {
    this.sessionService.castVote(card);
  }

  reveal(): void {
    this.sessionService.revealVotes();
  }

  reset(): void {
    this.sessionService.resetRound();
  }

  addStory(): void {
    const title = this.newStoryTitle.trim();
    if (!title) return;
    this.sessionService.addStory(title);
    this.newStoryTitle = '';
  }

  setActive(story_id: string): void {
    this.sessionService.setActiveStory(story_id);
  }

  finalize(): void {
    const story = this.currentStory();
    const estimate = this.finalEstimate.trim();
    if (!story || !estimate) return;
    this.sessionService.finalizeStory(story.id, estimate);
    this.finalEstimate = '';
  }

  openMenu(dialog: HTMLDialogElement): void {
    dialog.showModal();
    this.menuOpen.set(true);
  }

  closeMenu(dialog: HTMLDialogElement): void {
    dialog.close();
    this.menuOpen.set(false);
  }

  onBackdropClick(event: MouseEvent, dialog: HTMLDialogElement): void {
    if (event.target === dialog) this.closeMenu(dialog);
  }

  async copyCode(): Promise<void> {
    const code = this.session()?.id;
    if (code) await this.copy(code, 'Code copied');
  }

  async copyLink(): Promise<void> {
    const code = this.session()?.id;
    if (code) await this.copy(`${location.origin}/room/${code}`, 'Link copied');
  }

  private async copy(value: string, notice: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copyNotice.set(notice);
    } catch {
      this.copyNotice.set('Clipboard unavailable');
    }
  }

  removeParticipant(participant_id: string): void {
    this.sessionService.removeParticipant(participant_id);
  }

  leaveSession(): void {
    this.sessionService.leaveSession();
  }
}
