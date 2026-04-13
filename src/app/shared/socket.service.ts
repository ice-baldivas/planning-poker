import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

const SERVER_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket = io(SERVER_URL, { autoConnect: false });

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  emit(event: string, data?: unknown): void {
    this.socket.emit(event, data);
  }

  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => observer.next(data));
      return () => this.socket.off(event);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
