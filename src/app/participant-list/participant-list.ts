import { Component, input } from '@angular/core';
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
}
