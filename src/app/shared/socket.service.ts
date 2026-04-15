import { Injectable, OnDestroy, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const SERVER_URL = environment.serverUrl;

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'reconnected' | 'failed';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket = io(SERVER_URL, { autoConnect: false });

  readonly connectionStatus = signal<ConnectionStatus>('idle');

  private wasConnected = false;
  private reconnectedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.socket.on('connect', () => {
      if (this.wasConnected) {
        this.connectionStatus.set('reconnected');
        if (this.reconnectedTimer) clearTimeout(this.reconnectedTimer);
        this.reconnectedTimer = setTimeout(() => {
          this.connectionStatus.set('connected');
          this.reconnectedTimer = null;
        }, 2500);
      } else {
        this.wasConnected = true;
        this.connectionStatus.set('connected');
      }
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        this.connectionStatus.set('idle');
        this.wasConnected = false;
      } else {
        this.connectionStatus.set('reconnecting');
      }
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.connectionStatus.set('reconnecting');
    });

    this.socket.io.on('reconnect_failed', () => {
      this.connectionStatus.set('failed');
    });
  }

  connect(): void {
    if (!this.socket.connected) {
      if (!this.wasConnected) {
        this.connectionStatus.set('connecting');
      }
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
    if (this.reconnectedTimer) clearTimeout(this.reconnectedTimer);
    this.disconnect();
  }
}
