import { Component, input, output } from '@angular/core';
import { Participant } from '../shared/types';

@Component({
  selector: 'app-participant-list',
  imports: [],
  templateUrl: './participant-list.html',
  styleUrl: './participant-list.scss',
})
export class ParticipantListComponent {
  participants = input.required<Participant[]>();
  sessionStatus = input.required<'waiting' | 'voting' | 'revealed'>();
  moderatorId = input.required<string>();
  isModerator = input<boolean>(false);
  myParticipantId = input<string | null>(null);

  remove = output<string>();

  onRemove(participant: Participant): void {
    if (!confirm(`Remove ${participant.display_name} from the session?`)) return;
    this.remove.emit(participant.id);
  }
}
