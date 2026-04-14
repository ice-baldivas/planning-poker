import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../shared/session.service';
import { SessionMode, VotingScaleId } from '../shared/types';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  readonly tab = signal<'create' | 'join'>('create');

  // Create form
  sessionName = '';
  createDisplayName = '';
  selectedScale: VotingScaleId = 'fibonacci';
  selectedMode: SessionMode = 'stories';

  // Join form
  sessionCode = '';
  joinDisplayName = '';
  joinAsObserver = false;

  readonly error;

  constructor(private sessionService: SessionService) {
    this.error = sessionService.error;
  }

  createSession(): void {
    const name = this.sessionName.trim();
    const display_name = this.createDisplayName.trim();
    if (!name || !display_name) return;
    this.sessionService.createSession(name, display_name, this.selectedScale, this.selectedMode);
  }

  joinSession(): void {
    const code = this.sessionCode.trim();
    const display_name = this.joinDisplayName.trim();
    if (!code || !display_name) return;
    this.sessionService.joinSession(code, display_name, this.joinAsObserver ? 'observer' : 'team_member');
  }
}
