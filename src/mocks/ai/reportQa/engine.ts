import type { Citation, ReportAnswer } from '@/features/library';
import type { MockReport, MockSection } from '../../fixtures/reportContent';

export type QaResult = { steps: string[]; answer: ReportAnswer };

const SUMMARY =
  /summar|key (findings|points|takeaways)|overview|main points|tl;?dr|what does (this|the) report say/;
const ADVICE =
  /should (i|we) (invest|buy|sell)|good investment|worth investing|recommend (buying|investing)/;

function score(section: MockSection, question: string): number {
  let total = 0;
  for (const keyword of section.keywords) {
    if (question.includes(keyword)) total += keyword.includes(' ') ? 2 : 1;
  }
  for (const word of section.title.toLowerCase().split(/[^a-z0-9-]+/)) {
    if (word.length > 4 && question.includes(word)) total += 0.5;
  }
  return total;
}

function cite(sections: MockSection[]): { text: string; citations: Citation[] } {
  const citations = sections.map((section, i) => ({
    n: i + 1,
    sectionId: section.id,
    sectionTitle: section.title,
    passage: section.summary,
  }));
  const text = sections
    .map((section, i) => {
      const figure = section.figures[0];
      const extra = figure ? ` Key figure: ${figure.label.toLowerCase()}, ${figure.value}.` : '';
      return `${section.summary}${extra} [${i + 1}]`;
    })
    .join('\n\n');
  return { text, citations };
}

function followUps(report: MockReport, cited: MockSection[]): string[] {
  return report.sections
    .filter((s) => !cited.includes(s))
    .slice(0, 2)
    .map((s) => `What does it say about ${s.title.charAt(0).toLowerCase()}${s.title.slice(1)}?`);
}

/** Starter prompts shown before the first question (AI_NATIVE §4.1); each one is answerable. */
export function starterPrompts(report: MockReport): string[] {
  const about = (title: string) =>
    `What does it say about ${title.charAt(0).toLowerCase()}${title.slice(1)}?`;
  const risky = report.sections.find(
    (s) => s.keywords.includes('risk') || s.keywords.includes('risks'),
  );
  const [first, second] = report.sections;
  return [
    'Summarise the key findings',
    risky ? 'What are the main risks?' : about((second ?? first)?.title ?? ''),
    about((risky ? second : report.sections.at(-1))?.title ?? first?.title ?? ''),
  ].filter((prompt, index, all) => all.indexOf(prompt) === index);
}

/**
 * Scripted "Ask this report" (F3). Answers only from the report's own sections and cites
 * them; says plainly when the report doesn't cover a question (AI_NATIVE §1.3, §4.5).
 */
export function answerQuestion(report: MockReport, rawQuestion: string, id: string): QaResult {
  const question = rawQuestion.trim().toLowerCase();
  const steps = ['Reading this report', 'Finding the relevant sections'];

  if (ADVICE.test(question)) {
    const relevant = report.sections.slice(0, 2);
    const { text, citations } = cite(relevant);
    return {
      steps,
      answer: {
        id,
        question: rawQuestion,
        inReport: true,
        text: `I can’t give investment advice, but here is what the experts in this report say that bears on that decision:\n\n${text}`,
        citations,
        followUps: followUps(report, relevant),
      },
    };
  }

  if (SUMMARY.test(question)) {
    const top = report.sections.slice(0, 3);
    const { text, citations } = cite(top);
    return {
      steps: [...steps, 'Summarising'],
      answer: {
        id,
        question: rawQuestion,
        inReport: true,
        text: `Here are the main findings:\n\n${text}`,
        citations,
        followUps: followUps(report, top),
      },
    };
  }

  if (/disagree|differ|contradict/.test(question)) {
    const withQuotes = report.sections.filter((s) => s.quotes.length > 0).slice(0, 2);
    if (withQuotes.length >= 2) {
      const { text, citations } = cite(withQuotes);
      return {
        steps,
        answer: {
          id,
          question: rawQuestion,
          inReport: true,
          text: `The experts broadly agree; where views differ, it is on emphasis:\n\n${text}`,
          citations,
          followUps: followUps(report, withQuotes),
        },
      };
    }
  }

  const ranked = report.sections
    .map((section) => ({ section, score: score(section, question) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((r) => r.section);

  if (ranked.length === 0) {
    return {
      steps,
      answer: {
        id,
        question: rawQuestion,
        inReport: false,
        text: `I couldn’t find this in this report. It covers: ${report.sections.map((s) => s.title.toLowerCase()).join('; ')}.`,
        citations: [],
        followUps: starterPrompts(report).slice(0, 2),
      },
    };
  }

  const { text, citations } = cite(ranked);
  return {
    steps,
    answer: {
      id,
      question: rawQuestion,
      inReport: true,
      text,
      citations,
      followUps: followUps(report, ranked),
    },
  };
}
