import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SessionService } from '../shared/session.service';
import { ParticipantListComponent } from '../participant-list/participant-list';
import { CardSelectorComponent } from '../card-selector/card-selector';
import { ResultsPanelComponent } from '../results-panel/results-panel';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-room',
  imports: [ParticipantListComponent, CardSelectorComponent, ResultsPanelComponent, FormsModule],
  templateUrl: './room.html',
  styleUrl: './room.scss',
})
export class RoomComponent implements OnInit {
  @ViewChild(CardSelectorComponent) cardSelector?: CardSelectorComponent;

  readonly session;
  readonly me;
  readonly isScrumMaster;
  readonly currentStory;
  readonly lastResult;
  readonly error;

  // SM story form
  newStoryTitle = '';
  finalEstimate = '';

  constructor(
    private route: ActivatedRoute,
    readonly sessionService: SessionService,
  ) {
    this.session = sessionService.session;
    this.me = sessionService.me;
    this.isScrumMaster = sessionService.isScrumMaster;
    this.currentStory = sessionService.currentStory;
    this.lastResult = sessionService.lastResult;
    this.error = sessionService.error;
  }

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('id') ?? '';
    // Only rejoin if we have no live session state (e.g. page refresh).
    if (!this.session() && sessionId) {
      this.sessionService.joinSession(sessionId, 'Returning User');
    }
  }

  onCardPicked(card: string): void {
    this.sessionService.castVote(card);
  }

  reveal(): void {
    this.sessionService.revealVotes();
  }

  reset(): void {
    this.cardSelector?.reset();
    this.sessionService.resetRound();
  }

  addStory(): void {
    const title = this.newStoryTitle.trim();
    if (!title) return;
    this.sessionService.addStory(title);
    this.newStoryTitle = '';
  }

  setActive(story_id: string): void {
    this.cardSelector?.reset();
    this.sessionService.setActiveStory(story_id);
  }

  finalize(): void {
    const story = this.currentStory();
    const estimate = this.finalEstimate.trim();
    if (!story || !estimate) return;
    this.sessionService.finalizeStory(story.id, estimate);
    this.finalEstimate = '';
  }

  copyCode(): void {
    const code = this.session()?.id;
    if (code) navigator.clipboard.writeText(code);
  }

  leaveSession(): void {
    this.sessionService.leaveSession();
  }
}
