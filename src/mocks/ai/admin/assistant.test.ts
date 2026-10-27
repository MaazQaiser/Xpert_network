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
