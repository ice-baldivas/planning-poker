import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectionStatusComponent } from '../shared/connection-status/connection-status';
import { InfoToggleComponent } from '../shared/info-toggle/info-toggle';
import { ParticipantRole } from '../shared/types';

@Component({
  selector: 'app-gate',
  imports: [FormsModule, ConnectionStatusComponent, InfoToggleComponent],
  templateUrl: './gate.html',
  styleUrl: './gate.scss',
})
export class GateComponent {
  readonly sessionName = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly isConnecting = input(false);

  readonly join = output<{ displayName: string; role: 'team_member' | 'observer' }>();

  readonly participantDescription = 'Can vote on stories and rounds.';
  readonly spectatorDescription = 'Observes the session without voting — useful for stakeholders.';

  displayName = '';
  anonymous = false;
  role: Extract<ParticipantRole, 'team_member' | 'observer'> = 'team_member';

  toggleAnonymous(): void {
    if (this.anonymous) {
      const suffix = 1000 + Math.floor(Math.random() * 9000);
      this.displayName = `Anonymous #${suffix}`;
    } else {
      this.displayName = '';
    }
  }

  submit(): void {
    const name = this.displayName.trim();
    if (!name) return;
    this.join.emit({ displayName: name, role: this.role });
  }
}
