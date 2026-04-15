import { Component } from '@angular/core';
import { SocketService } from '../socket.service';

@Component({
  selector: 'app-connection-status',
  templateUrl: './connection-status.html',
  styleUrl: './connection-status.scss',
})
export class ConnectionStatusComponent {
  readonly status;

  constructor(socketService: SocketService) {
    this.status = socketService.connectionStatus;
  }
}
