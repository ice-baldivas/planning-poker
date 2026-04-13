import { Component, input } from '@angular/core';
import { RoundResult } from '../shared/types';

@Component({
  selector: 'app-results-panel',
  imports: [],
  templateUrl: './results-panel.html',
  styleUrl: './results-panel.scss',
})
export class ResultsPanelComponent {
  result = input.required<RoundResult>();
}
