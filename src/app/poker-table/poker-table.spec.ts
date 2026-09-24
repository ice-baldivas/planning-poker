import { TestBed } from '@angular/core/testing';
import { PokerTableComponent } from './poker-table';
import { Participant } from '../shared/types';

describe('PokerTableComponent', () => {
  const participants: Participant[] = [
    {
      id: 'mod',
      display_name: 'Moderator',
      role: 'moderator',
      is_connected: true,
      has_voted: true,
    },
    {
      id: 'member',
      display_name: 'Member',
      role: 'team_member',
      is_connected: false,
      has_voted: false,
    },
    {
      id: 'viewer',
      display_name: 'Viewer',
      role: 'observer',
      is_connected: true,
      has_voted: false,
    },
  ];

  async function render(status = 'voting') {
    const fixture = TestBed.createComponent(PokerTableComponent);
    fixture.componentRef.setInput('participants', participants);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('result', {
      votes: [{ participant_id: 'mod', display_name: 'Moderator', card_value: '13' }],
      consensus: true,
      consensus_value: '13',
    });
    await fixture.whenStable();
    return fixture;
  }

  it('partitions observers and never renders supplied values before reveal', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.seat')).toHaveLength(2);
    expect(element.querySelectorAll('.spectator')).toHaveLength(1);
    expect(element.querySelectorAll('.face-down')).toHaveLength(1);
    expect(element.querySelectorAll('.avatar.voted')).toHaveLength(1);
    expect(element.textContent).not.toContain('13');
    expect(element.innerHTML).not.toContain('card_value');
    expect(element.textContent).toContain('Away');
  });

  it('reveals values by participant ID and preserves partial and departed results', async () => {
    const fixture = await render('revealed');
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[data-participant-id="mod"] .face-up')?.textContent).toContain(
      '13',
    );
    expect(element.querySelector('[data-participant-id="member"]')?.textContent).toContain(
      'No vote',
    );
    fixture.componentRef.setInput(
      'participants',
      participants.filter((person) => person.id !== 'mod'),
    );
    await fixture.whenStable();
    expect(element.querySelector('.departed-results')?.textContent).toContain('Moderator: 13');
    fixture.componentRef.setInput('status', 'waiting');
    await fixture.whenStable();
    expect(element.querySelectorAll('.table-card')).toHaveLength(0);
    expect(element.querySelector('.departed-results')).toBeNull();
  });
});
