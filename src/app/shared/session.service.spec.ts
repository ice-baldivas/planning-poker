import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { SessionService } from './session.service';
import { SocketService } from './socket.service';
import { SessionState } from './types';
import { CardSelectorComponent } from '../card-selector/card-selector';

describe('SessionService table synchronization', () => {
  const state: SessionState = {
    id: '123456',
    name: 'Test',
    moderator_id: 'mod',
    auto_reveal: false,
    voting_scale: { id: 'fibonacci', name: 'Fibonacci', cards: ['3', '5'] },
    session_mode: 'free',
    round_number: 1,
    status: 'voting',
    current_story_id: null,
    stories: [],
    participants: [],
    created_at: '',
  };

  function setup() {
    const events = new Map<string, Subject<unknown>>();
    const emit = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: SocketService,
          useValue: {
            connectionStatus: signal('connected'),
            emit,
            on: (name: string) => {
              if (!events.has(name)) events.set(name, new Subject());
              return events.get(name)!;
            },
          },
        },
      ],
    });
    const service = TestBed.inject(SessionService);
    events.get('session_state')!.next(state);
    return { service, events, emit };
  }

  it('requests settings without optimistic mutation and preserves replayed results on setting changes', () => {
    const { service, events, emit } = setup();
    service.setAutoReveal(true);
    expect(emit).toHaveBeenCalledWith('set_auto_reveal', { enabled: true });
    expect(service.session()?.auto_reveal).toBe(false);
    const result = { votes: [], consensus: false, consensus_value: null };
    events.get('votes_revealed')!.next(result);
    events.get('auto_reveal_changed')!.next({ enabled: true });
    expect(service.session()?.auto_reveal).toBe(true);
    expect(service.lastResult()).toEqual(result);
    events.get('round_reset')!.next({ round_number: 2 });
    expect(service.lastResult()).toBeNull();
    expect(service.session()?.auto_reveal).toBe(true);
  });

  it('resets local deck selection for remote resets and repeated active-story events', async () => {
    const { service, events } = setup();
    const fixture = TestBed.createComponent(CardSelectorComponent);
    fixture.componentRef.setInput('cards', ['3', '5']);
    fixture.componentRef.setInput('resetRevision', service.voteRevision());
    await fixture.whenStable();
    for (const [event, payload] of [
      ['round_reset', { round_number: 2 }],
      ['active_story_changed', { story_id: 'same' }],
      ['active_story_changed', { story_id: 'same' }],
    ] as const) {
      fixture.componentInstance.selectCard('5');
      await fixture.whenStable();
      expect(fixture.componentInstance.selected()).toBe('5');
      events.get(event)!.next(payload);
      fixture.componentRef.setInput('resetRevision', service.voteRevision());
      await fixture.whenStable();
      expect(fixture.componentInstance.selected()).toBeNull();
    }
  });
});
