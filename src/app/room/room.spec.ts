import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RoomComponent } from './room';
import { SessionService } from '../shared/session.service';
import { ParticipantRole, SessionState } from '../shared/types';

describe('RoomComponent', () => {
  async function render(role: ParticipantRole, mode: 'free' | 'stories' = 'free') {
    const session = signal<SessionState>({
      id: '123456',
      name: 'Sprint planning',
      moderator_id: 'me',
      auto_reveal: false,
      voting_scale: { id: 'fibonacci', name: 'Fibonacci', cards: ['3', '5'] },
      session_mode: mode,
      round_number: 1,
      status: mode === 'free' ? 'voting' : 'waiting',
      current_story_id: null,
      stories: [],
      created_at: '',
      participants: [{ id: 'me', role, display_name: 'Me', has_voted: false, is_connected: true }],
    });
    const me = computed(() => session().participants[0]);
    const actions = {
      castVote: vi.fn(),
      revealVotes: vi.fn(),
      resetRound: vi.fn(),
      setAutoReveal: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: {
            session,
            me,
            isModerator: computed(() => me().role === 'moderator'),
            currentStory: signal(null),
            lastResult: signal(null),
            error: signal(null),
            isConnecting: signal(false),
            voteRevision: signal(0),
            ...actions,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(RoomComponent);
    await fixture.whenStable();
    return { fixture, session, actions, element: fixture.nativeElement as HTMLElement };
  }

  for (const role of ['moderator', 'team_member', 'observer'] as const) {
    it(`shows only appropriate controls and deck for ${role}`, async () => {
      const { element } = await render(role);
      expect(element.querySelector('h1')?.textContent).toBe('Sprint planning');
      expect(element.querySelector('h2')?.textContent?.trim()).toBe('Round 1');
      expect(!!element.querySelector('app-card-selector')).toBe(role !== 'observer');
      expect(!!element.querySelector('.moderator-controls')).toBe(role === 'moderator');
      expect(!!element.querySelector('.participant-management')).toBe(role === 'moderator');
      expect(element.querySelector('.session-actions')?.textContent).toContain('Leave Session');
      expect(element.querySelector('.session-actions')?.textContent).toContain('Copy Link');
    });
  }

  it('forwards votes but marks the seat only after server acceptance', async () => {
    const { element, fixture, actions, session } = await render('moderator');
    element.querySelector<HTMLButtonElement>('.poker-card')!.click();
    await fixture.whenStable();
    expect(actions.castVote).toHaveBeenCalledWith('3');
    expect(element.querySelector('.avatar.voted')).toBeNull();
    session.update((value) => ({
      ...value,
      participants: value.participants.map((person) => ({ ...person, has_voted: true })),
    }));
    await fixture.whenStable();
    expect(element.querySelector('.avatar.voted')).not.toBeNull();
    session.update((value) => ({
      ...value,
      participants: value.participants.map((person) => ({ ...person, role: 'team_member' })),
    }));
    await fixture.whenStable();
    expect(element.querySelector('.moderator-controls')).toBeNull();
  });

  it('allows the switch default action inside the drawer and requests a setting change', async () => {
    const { element, fixture, actions } = await render('moderator');
    element.querySelector<HTMLInputElement>('#auto-reveal')!.click();
    await fixture.whenStable();
    expect(actions.setAutoReveal).toHaveBeenCalledWith(true);
  });

  it('keeps story voting disabled until an active story exists', async () => {
    const { element } = await render('moderator', 'stories');
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('No active story');
    expect(element.querySelector<HTMLButtonElement>('.poker-card')?.disabled).toBe(true);
    expect(element.querySelector('#new-story')).not.toBeNull();
  });
});
