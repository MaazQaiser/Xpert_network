import { describe, expect, it } from 'vitest';
import { REPORT_CONTENT } from '../../fixtures/reportContent';
import { answerQuestion, starterPrompts } from './engine';

const riyadh = REPORT_CONTENT.lib_riyadh_cafe_supply!;

describe('report Q&A engine', () => {
  it('answers from the matching section and cites it', () => {
    const { answer } = answerQuestion(
      riyadh,
      'How long does an espresso machine take to arrive?',
      'a1',
    );
    expect(answer.inReport).toBe(true);
    expect(answer.citations[0]).toMatchObject({ n: 1, sectionId: 's2' });
    expect(answer.text).toContain('[1]');
    expect(answer.followUps.length).toBeGreaterThan(0);
  });

  it('summarises with one citation per section used', () => {
    const { answer } = answerQuestion(riyadh, 'Summarise the key findings', 'a2');
    expect(answer.citations.map((c) => c.sectionId)).toEqual(['s1', 's2', 's3']);
  });

  it('says plainly when the report does not cover a question', () => {
    const { answer } = answerQuestion(riyadh, 'What is the weather like in Abha?', 'a3');
    expect(answer.inReport).toBe(false);
    expect(answer.citations).toEqual([]);
    expect(answer.text).toMatch(/^I couldn’t find this in this report/);
  });

  it('declines investment advice but still cites the report', () => {
    const { answer } = answerQuestion(
      REPORT_CONTENT.lib_qahwa_ops!,
      'Should I invest in Qahwa House?',
      'a4',
    );
    expect(answer.text).toMatch(/can’t give investment advice/);
    expect(answer.citations.length).toBeGreaterThan(0);
  });

  it('offers starter prompts this report can actually answer', () => {
    for (const report of Object.values(REPORT_CONTENT)) {
      for (const prompt of starterPrompts(report)) {
        expect(answerQuestion(report, prompt, 'x').answer.inReport).toBe(true);
      }
    }
  });
});
