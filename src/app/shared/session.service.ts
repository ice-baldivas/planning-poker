import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { SocketService } from './socket.service';
import {
  SessionState,
  Participant,
  Story,
  RoundResult,
  VotingScaleId,
} from './types';

const STORAGE_KEY = 'pp_participant';

interface StoredParticipant {
  session_id: string;
  participant_id: string;
}

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  private subscriptions: Subscription[] = [];

  // ---------------------------------------------------------------------------
  // State signals
  // ---------------------------------------------------------------------------
  readonly session = signal<SessionState | null>(null);
  readonly myParticipantId = signal<string | null>(null);
  readonly lastResult = signal<RoundResult | null>(null);
  readonly error = signal<string | null>(null);

  readonly me = computed(() => {
    const s = this.session();
    const id = this.myParticipantId();
    if (!s || !id) return null;
    return s.participants.find(p => p.id === id) ?? null;
  });

  readonly isScrumMaster = computed(() => this.me()?.role === 'scrum_master');

  readonly currentStory = computed(() => {
    const s = this.session();
    if (!s?.current_story_id) return null;
    return s.stories.find(st => st.id === s.current_story_id) ?? null;
  });

  constructor(private socket: SocketService, private router: Router) {
    this.registerSocketEvents();
  }

  // ---------------------------------------------------------------------------
  // Socket event wiring
  // ---------------------------------------------------------------------------
  private registerSocketEvents(): void {
    this.sub(this.socket.on<SessionState>('session_state'), state => {
      if (state.your_participant_id) {
        this.myParticipantId.set(state.your_participant_id);
        this.persist({ session_id: state.id, participant_id: state.your_participant_id });
      }
      this.session.set(state);
      this.lastResult.set(null);
    });

    this.sub(this.socket.on<Participant>('participant_joined'), p => {
      this.session.update(s => s ? { ...s, participants: [...s.participants, p] } : s);
    });

    this.sub(this.socket.on<{ participant_id: string }>('participant_left'), ({ participant_id }) => {
      this.session.update(s => s ? {
        ...s,
        participants: s.participants.map(p =>
          p.id === participant_id ? { ...p, is_connected: false } : p
        ),
      } : s);
    });

    this.sub(this.socket.on<{ participant_id: string }>('participant_reconnected'), ({ participant_id }) => {
      this.session.update(s => s ? {
        ...s,
        participants: s.participants.map(p =>
          p.id === participant_id ? { ...p, is_connected: true } : p
        ),
      } : s);
    });

    this.sub(this.socket.on<{ participant_id: string }>('vote_cast'), ({ participant_id }) => {
      this.session.update(s => s ? {
        ...s,
        participants: s.participants.map(p =>
          p.id === participant_id ? { ...p, has_voted: true } : p
        ),
      } : s);
    });

    this.sub(this.socket.on<RoundResult>('votes_revealed'), result => {
      this.lastResult.set(result);
      this.session.update(s => s ? { ...s, status: 'revealed' } : s);
    });

    this.sub(this.socket.on<{ story_id: string | null }>('round_reset'), () => {
      this.lastResult.set(null);
      this.session.update(s => s ? {
        ...s,
        status: 'voting',
        participants: s.participants.map(p => ({ ...p, has_voted: false })),
      } : s);
    });

    this.sub(this.socket.on<Story>('story_added'), story => {
      this.session.update(s => s ? { ...s, stories: [...s.stories, story] } : s);
    });

    this.sub(this.socket.on<{ story_id: string }>('active_story_changed'), ({ story_id }) => {
      this.session.update(s => s ? {
        ...s,
        current_story_id: story_id,
        status: 'voting',
        participants: s.participants.map(p => ({ ...p, has_voted: false })),
        stories: s.stories.map(st => ({
          ...st,
          status: st.id === story_id ? 'active' : (st.status === 'active' ? 'pending' : st.status),
        })),
      } : s);
      this.lastResult.set(null);
    });

    this.sub(this.socket.on<Story>('story_finalized'), finalized => {
      this.session.update(s => s ? {
        ...s,
        stories: s.stories.map(st => st.id === finalized.id ? finalized : st),
        current_story_id: s.current_story_id === finalized.id ? null : s.current_story_id,
        status: 'waiting',
      } : s);
    });

    this.sub(this.socket.on<{ new_sm_id: string }>('sm_transferred'), ({ new_sm_id }) => {
      this.session.update(s => s ? {
        ...s,
        scrum_master_id: new_sm_id,
        participants: s.participants.map(p => ({
          ...p,
          role: p.id === new_sm_id ? 'scrum_master' : (p.role === 'scrum_master' ? 'team_member' : p.role),
        })),
      } : s);
    });

    this.sub(this.socket.on<{ code: string; message: string }>('error'), err => {
      this.error.set(err.message);
    });
  }

  // ---------------------------------------------------------------------------
  // Public actions
  // ---------------------------------------------------------------------------
  createSession(name: string, display_name: string, voting_scale_id: VotingScaleId): void {
    this.error.set(null);
    this.socket.connect();
    this.socket.emit('create_session', { name, display_name, voting_scale_id });
    this.waitForSession();
  }

  joinSession(session_id: string, display_name: string, role: 'team_member' | 'observer' = 'team_member'): void {
    this.error.set(null);
    this.socket.connect();
    const stored = this.getStored();
    const participant_id = stored?.session_id === session_id ? stored.participant_id : undefined;
    this.socket.emit('join_session', { session_id, display_name, role, participant_id });
    this.waitForSession();
  }

  castVote(card_value: string): void {
    this.socket.emit('cast_vote', { card_value });
  }

  revealVotes(): void {
    this.socket.emit('reveal_votes');
  }

  resetRound(): void {
    this.socket.emit('reset_round');
  }

  addStory(title: string, description?: string): void {
    this.socket.emit('add_story', { title, description });
  }

  setActiveStory(story_id: string): void {
    this.socket.emit('set_active_story', { story_id });
  }

  finalizeStory(story_id: string, final_estimate: string): void {
    this.socket.emit('finalize_story', { story_id, final_estimate });
  }

  transferSM(new_sm_id: string): void {
    this.socket.emit('transfer_sm', { new_sm_id });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private waitForSession(): void {
    const sub = this.socket.on<SessionState>('session_state').subscribe(state => {
      this.router.navigate(['/room', state.id]);
      sub.unsubscribe();
    });
  }

  private sub<T>(obs: Observable<T>, handler: (v: T) => void): void {
    this.subscriptions.push(obs.subscribe(handler));
  }

  private persist(data: StoredParticipant): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  private getStored(): StoredParticipant | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
