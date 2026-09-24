import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class InfoToggleService {
  readonly openId = signal<string | null>(null);

  toggle(id: string): void {
    this.openId.set(this.openId() === id ? null : id);
  }

  close(id: string): void {
    if (this.openId() === id) this.openId.set(null);
  }
}
