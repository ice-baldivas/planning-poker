import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../shared/session.service';
import { SocketService } from '../shared/socket.service';
import { SessionMode, VotingScaleId } from '../shared/types';
import { ConnectionStatusComponent } from '../shared/connection-status/connection-status';
import { InfoToggleComponent } from '../shared/info-toggle/info-toggle';
import { CodeInputComponent } from '../shared/code-input/code-input';

@Component({
  selector: 'app-home',
  imports: [FormsModule, ConnectionStatusComponent, InfoToggleComponent, CodeInputComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  readonly tab = signal<'create' | 'join'>('create');

  // Create form
  sessionName = '';
  createDisplayName = '';
  selectedScale: VotingScaleId = 'fibonacci';
  selectedMode: SessionMode = 'free';
  readonly fibonacciDescription =
    'Numbers spaced further apart at higher values (1, 2, 3, 5, 8, 13, 21...) to reflect increasing uncertainty for larger estimates.';
  readonly tshirtDescription =
    'Relative sizing from XS to XXL is good for quick, rough estimates without numeric precision.';
  readonly freeRoundsDescription = 'Start, reveal, and reset rounds without creating stories.';
  readonly storiesDescription = 'Manage a backlog of stories; each round is linked to a story.';

  // Join form
  sessionCode = '';
  joinDisplayName = '';
  joinAsObserver = false;

  readonly error;
  readonly isConnecting;
  readonly notice;

  constructor(
    private sessionService: SessionService,
    socketService: SocketService,
  ) {
    this.error = sessionService.error;
    this.notice = sessionService.notice;
    this.isConnecting = computed(() => {
      const s = socketService.connectionStatus();
      return s === 'connecting' || s === 'reconnecting';
    });
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
    this.sessionService.joinSession(
      code,
      display_name,
      this.joinAsObserver ? 'observer' : 'team_member',
    );
  }

  dismissNotice(): void {
    this.sessionService.dismissNotice();
  }
}
