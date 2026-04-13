export type VotingScaleId = 'fibonacci' | 'tshirt';
export type ParticipantRole = 'scrum_master' | 'team_member' | 'observer';
export type SessionStatus = 'waiting' | 'voting' | 'revealed';

export interface VotingScale {
  id: VotingScaleId;
  name: string;
  cards: string[];
}

export interface Participant {
  id: string;
  display_name: string;
  role: ParticipantRole;
  is_connected: boolean;
  has_voted: boolean;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'active' | 'estimated';
  final_estimate?: string;
}

export interface RoundResult {
  votes: { participant_id: string; display_name: string; card_value: string }[];
  consensus: boolean;
  consensus_value: string | null;
}

export interface SessionState {
  id: string;
  name: string;
  scrum_master_id: string;
  voting_scale: VotingScale;
  status: SessionStatus;
  current_story_id: string | null;
  stories: Story[];
  participants: Participant[];
  created_at: string;
  /** Only present on the initial session_state event. */
  your_participant_id?: string;
}
