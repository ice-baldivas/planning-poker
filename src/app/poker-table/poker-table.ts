import { Component, computed, input } from '@angular/core';
import { Participant, RoundResult, SessionStatus } from '../shared/types';
import { ResultsPanelComponent } from '../results-panel/results-panel';

@Component({
  selector: 'app-poker-table',
  imports: [ResultsPanelComponent],
  templateUrl: './poker-table.html',
  styleUrl: './poker-table.scss',
})
export class PokerTableComponent {
  readonly participants = input.required<Participant[]>();
  readonly status = input.required<SessionStatus>();
  readonly myParticipantId = input<string | null>(null);
  readonly result = input<RoundResult | null>(null);
  readonly voters = computed(() =>
    this.participants().filter((person) => person.role !== 'observer'),
  );
  readonly spectators = computed(() =>
    this.participants().filter((person) => person.role === 'observer'),
  );
  readonly votedCount = computed(() => this.voters().filter((person) => person.has_voted).length);
  readonly publicResult = computed(() => (this.status() === 'revealed' ? this.result() : null));
  readonly values = computed(
    () => new Map(this.publicResult()?.votes.map((vote) => [vote.participant_id, vote.card_value])),
  );
  readonly departedVotes = computed(() => {
    const seated = new Set(this.voters().map((person) => person.id));
    return this.publicResult()?.votes.filter((vote) => !seated.has(vote.participant_id)) ?? [];
  });
}
