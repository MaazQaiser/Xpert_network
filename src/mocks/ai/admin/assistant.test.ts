import { describe, expect, it } from 'vitest';
import { db } from '@/test/mockBackend';
import { assistantReply } from './assistant';

describe('assistantReply: screening answers', () => {
  const screened = [{ projectId: 'PRJ-1043', expertId: 'exp_sb', name: 'Sophia Bell' }];

  it('opens one expert’s answers when the PM asks for them by name', () => {
    const reply = assistantReply(
      'View me the screening answers of Sophia Bell',
      db.get(),
      new Date(),
      'Umer',
      screened,
    );
    expect(reply.text).toMatch(/\*\*Sophia Bell\*\*’s screening answers for \*\*UK MRO carve-out/);
    expect(reply.blocks).toEqual([
      {
        kind: 'screeningAnswers',
        projectId: 'PRJ-1043',
        expertId: 'exp_sb',
        expertName: 'Sophia Bell',
      },
    ]);
  });

  it('ignores a name that wasn’t sent the questions', () => {
    const reply = assistantReply(
      'Show the screening answers of Jane Nobody',
      db.get(),
      new Date(),
      'Umer',
      screened,
    );
    expect(reply.blocks.some((b) => 'expertId' in b)).toBe(false);
  });

  it('shows who answered for the latest project when none is named', () => {
    const reply = assistantReply(
      'Viuew the Screening Answer of the Expert how answerd',
      db.get(),
      new Date(),
      'Umer',
      screened,
    );
    expect(reply.text).toMatch(/experts who have answered the screening questions so far/);
    expect(reply.blocks).toEqual([{ kind: 'screeningAnswers', projectId: 'PRJ-1043' }]);
  });

  it('says so when no screening questions have gone out', () => {
    const reply = assistantReply('Show the screening answers', db.get(), new Date(), 'Umer', []);
    expect(reply.text).toMatch(/No screening questions have gone out yet/);
    expect(reply.blocks).toEqual([]);
  });
});

describe('assistantReply: home suggestions', () => {
  const state = db.get();

  it('shares the progress of every project', () => {
    const reply = assistantReply('Share progress of all projects', state);
    expect(reply.text).toContain('[[!6 projects]]');
    expect(reply.blocks).toMatchObject([
      {
        kind: 'projects',
        items: [
          { projectId: 'PRJ-1042', status: 'Draft' },
          { projectId: 'PRJ-1043', status: 'Draft' },
          { projectId: 'PRJ-1044', status: 'Draft' },
          { projectId: 'PRJ-1039', status: 'Matching' },
          { projectId: 'PRJ-1041', status: 'Matching' },
          { projectId: 'PRJ-1040', status: 'Pitching' },
        ],
      },
    ]);
  });

  it('lists the active projects from the home card', () => {
    const reply = assistantReply('Which active projects need me today?', state);
    expect(reply.text).toContain('[[!2 active projects]]');
    expect(reply.blocks).toMatchObject([
      {
        kind: 'projects',
        items: [
          { projectId: 'PRJ-1041', status: 'Matching', href: '/admin/projects/PRJ-1041' },
          { projectId: 'PRJ-1040', status: 'Pitching', href: '/admin/projects/PRJ-1040' },
        ],
      },
    ]);
  });

  it('reports the team roster', () => {
    const reply = assistantReply('Show the team progress report', state);
    expect(reply.text).toMatch(/\*\*Amira Hassan\*\* is carrying the booked work/);
    expect(reply.text).toMatch(/\*\*Jon Reeves\*\* is inactive/);
    expect(reply.basis).toBe('Team roster');
    expect(reply.blocks).toMatchObject([
      {
        kind: 'team',
        items: [
          { name: 'Umer', openProjects: 4, bookedProjects: 2, avgHoursToBrief: 1.4 },
          { name: 'Amira Hassan', openProjects: 3, bookedProjects: 5 },
          { name: 'Jon Reeves', active: false, bookedProjects: 0 },
        ],
      },
    ]);
  });

  it('lists the three newest inbox conversations', () => {
    const reply = assistantReply('Show recent conversations', state);
    expect(reply.text).toContain('[[3 most recent conversations]]');
    expect(reply.blocks).toMatchObject([
      {
        kind: 'emails',
        items: [
          { from: { name: 'Jenna Cho' } },
          { from: { name: 'Amy Wang' } },
          { from: { name: 'Mei Tanaka' } },
        ],
      },
    ]);
    expect(reply.chips).toEqual([
      { label: 'See all emails in the Inbox', prompt: null, href: '/admin/inbox' },
    ]);
  });

  it('summarises company progress from projects and the inbox', () => {
    const reply = assistantReply('Show overall company progress', state);
    expect(reply.text).toContain('[[!4 expert answers]]');
    expect(reply.text).toMatch(/3 still in draft and 3 in matching or pitching/);
    expect(reply.blocks).toEqual([
      {
        kind: 'stats',
        items: [
          { label: 'Stage', value: '3 draft, 3 matching or pitching' },
          { label: 'Reviews', value: '4 waiting' },
          { label: 'Emails stuck', value: '3 cannot become a brief yet' },
        ],
      },
    ]);
  });

  it('gives a one-line answer when there is no data', () => {
    const empty = { adminInbox: {}, adminProjects: {} };
    const ask = (text: string) => assistantReply(text, empty, new Date(), 'Umer', [], []);
    expect(ask('Share progress of all projects').blocks).toEqual([]);
    expect(ask('Share progress of all projects').text).toMatch(/no project progress/);
    expect(ask('Which active projects need me today?').text).toMatch(/no active projects/);
    expect(ask('Show the team progress report').text).toMatch(/No one is on the team roster/);
    expect(ask('Show recent conversations').text).toMatch(/No recent conversations/);
    expect(ask('Show overall company progress').text).toMatch(/no company progress/);
    for (const text of [
      'Share progress of all projects',
      'Show the team progress report',
      'Show recent conversations',
      'Show overall company progress',
    ]) {
      expect(ask(text).blocks).toEqual([]);
    }
  });
});
