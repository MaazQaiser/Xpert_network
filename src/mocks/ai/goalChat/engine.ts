import {
  GATHERING_STEPS,
  GOAL_TYPE_LABELS,
  STEP_IDS,
  STEP_LABELS,
  summariseCoverage,
  type ChatMessage,
  type CoverageResult,
  type GoalType,
  type Question,
  type ResearchBrief,
  type StepId,
  type Subject,
  type TurnAction,
  type Widget,
} from '@/features/goal-chat';
import type { User } from '@/features/auth';
import { createId } from '@/shared/lib/id';
import { ALL_SUBJECTS } from '../../fixtures/entities';
import {
  OBJECTIVE_STARTERS,
  QUESTION_BANK,
  SUBJECT_SUGGESTIONS,
} from '../../fixtures/questionBank';
import { resolveSubject } from './subjects';

export type EngineContext = {
  user: User;
  now: Date;
  /** Lazily computed when the turn needs it (options step). */
  getCoverage: (brief: ResearchBrief) => CoverageResult;
  /** The widget on the latest assistant message, if any. */
  lastWidget: Widget | null;
};

export type EngineResult = {
  brief: ResearchBrief;
  /** The user's side of the turn as shown in the transcript, or null for silent actions. */
  userText: string | null;
  /** Agentic progress labels streamed before the reply. */
  steps: string[];
  reply: string;
  widget: Widget | null;
};

/** Thrown for invalid input the client should have prevented; becomes a 422. */
export class TurnRejected extends Error {}

const OFF_TOPIC = /\b(weather|joke|football|movie|recipe|song|poem|who are you)\b/i;
const GREETING = /^(hi|hello|hey|salam|thanks|thank you|ok|okay)[.!]*$/i;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function withStep(brief: ResearchBrief, step: StepId): ResearchBrief {
  return { ...brief, currentStep: step, stepStatus: { ...brief.stepStatus, [step]: 'active' } };
}

/** Marks `step` done and moves to the next step that still needs work. */
function completeStep(
  brief: ResearchBrief,
  step: StepId,
  status: 'done' | 'attention' = 'done',
): ResearchBrief {
  const stepStatus = { ...brief.stepStatus, [step]: status };
  const isRevisit = GATHERING_STEPS.includes(step) && stepStatus.summary !== 'todo';
  const next: StepId = isRevisit
    ? 'summary'
    : (STEP_IDS.slice(STEP_IDS.indexOf(step) + 1).find((id) => stepStatus[id] !== 'done') ??
      'checkout');
  return withStep({ ...brief, stepStatus }, next);
}

/** A change to the brief after the summary re-opens the confirmation. */
function invalidateConfirmation(brief: ResearchBrief): ResearchBrief {
  if (brief.status !== 'confirmed') return brief;
  return {
    ...brief,
    status: 'draft',
    chosenOption: null,
    stepStatus: { ...brief.stepStatus, summary: 'active', options: 'todo', checkout: 'todo' },
  };
}

function primarySubject(brief: ResearchBrief, kind: Subject['kind'], fallback: string): string {
  return brief.subjects.find((s) => s.kind === kind)?.label ?? fallback;
}

export function suggestQuestions(brief: ResearchBrief): Question[] {
  const goalType = brief.goalType ?? 'other';
  const company = primarySubject(brief, 'company', 'the company');
  const region = primarySubject(brief, 'region', 'the region');
  const industry = primarySubject(brief, 'industry', 'the sector');
  return QUESTION_BANK[goalType].map((template, index) => ({
    id: `q_${index + 1}_${template.topic}`,
    topic: template.topic,
    source: 'ai' as const,
    text: template.text
      .replaceAll('{company}', company)
      .replaceAll('{region}', region)
      .replaceAll('{industry}', industry.toLowerCase()),
  }));
}

function subjectSuggestions(brief: ResearchBrief): Subject[] {
  const ids = SUBJECT_SUGGESTIONS[brief.goalType ?? 'other'];
  return ids
    .map((id) => ALL_SUBJECTS.find((s) => s.id === id))
    .filter((s): s is Subject => s !== undefined && !brief.subjects.some((b) => b.id === s.id));
}

function subjectsWidget(
  brief: ResearchBrief,
  candidates: Subject[] = [],
  unresolved: string | null = null,
): Widget {
  return { kind: 'subjects', suggestions: subjectSuggestions(brief), candidates, unresolved };
}

function starterChips(goalType: GoalType): Widget {
  return {
    kind: 'starters',
    chips: OBJECTIVE_STARTERS[goalType].map((label, index) => ({ id: `starter_${index}`, label })),
  };
}

function titleFor(brief: ResearchBrief): string {
  const subject = brief.subjects[0]?.label;
  if (brief.goalType === 'invest' && subject) return `${subject}: investment research`;
  if (brief.goalType === 'expand' && subject) return `Expansion into ${subject}`;
  if (subject) return `${subject}: market research`;
  return brief.objective ? brief.objective.slice(0, 60) : 'Untitled brief';
}

function detectGoalType(text: string): GoalType | null {
  if (/\b(invest|stake|acquire|due diligence|ic meeting|valuation)\b/i.test(text)) return 'invest';
  if (/\b(expand|franchise|open|launch|new region|sourcing|branch)\b/i.test(text)) return 'expand';
  if (/\b(market|size|landscape|trend)\b/i.test(text)) return 'market';
  return null;
}

function result(
  brief: ResearchBrief,
  userText: string | null,
  reply: string,
  widget: Widget | null,
  steps: string[] = [],
): EngineResult {
  return { brief, userText, reply, widget, steps };
}

// ——— Step prompts ————————————————————————————————————————————————

function askGoal(brief: ResearchBrief, userText: string | null, firstName: string): EngineResult {
  return result(
    withStep(brief, 'goal'),
    userText,
    `Hi ${firstName}. Let’s scope your research in a few short steps. What decision are you trying to make?`,
    { kind: 'goal-types', options: ['invest', 'expand', 'market', 'other'] },
  );
}

function askSubject(brief: ResearchBrief, userText: string | null, lead: string): EngineResult {
  return result(
    withStep(brief, 'subject'),
    userText,
    `${lead} Which company, industry, region or time frame should the research focus on? Add as many as you need.`,
    subjectsWidget(brief),
  );
}

function askQuestions(brief: ResearchBrief, userText: string | null): EngineResult {
  return result(
    withStep(brief, 'questions'),
    userText,
    'Here are the questions experts are usually asked for a goal like yours. Keep the ones that matter, put them in priority order, and add your own. Choose between 3 and 10.',
    {
      kind: 'questions',
      suggestions: brief.questions.length ? brief.questions : suggestQuestions(brief),
    },
    ['Reading your goal', 'Drafting questions'],
  );
}

function askConstraints(brief: ResearchBrief, userText: string | null): EngineResult {
  return result(
    withStep(brief, 'constraints'),
    userText,
    'When do you need answers, and roughly how many credits do you want to spend? Depth sets how many experts we’d involve if custom research is needed.',
    { kind: 'constraints' },
  );
}

function showSummary(brief: ResearchBrief, userText: string | null, lead: string): EngineResult {
  const draft = {
    objective: brief.objective,
    subjects: brief.subjects,
    questions: brief.questions,
    constraints: brief.constraints,
  };
  const next: ResearchBrief = {
    ...withStep(brief, 'summary'),
    title: titleFor(brief),
    aiSnapshot: draft,
    isEditedByUser: false,
  };
  return result(
    next,
    userText,
    `${lead} Here’s your research brief. Check it, edit anything that’s off, then confirm your needs.`,
    { kind: 'summary' },
    ['Assembling your research brief'],
  );
}

// ——— Turn handler ————————————————————————————————————————————————

export function runTurn(
  input: ResearchBrief,
  action: TurnAction,
  ctx: EngineContext,
): EngineResult {
  const brief: ResearchBrief = { ...input, updatedAt: ctx.now.toISOString() };
  const firstName = ctx.user.name.split(' ')[0] ?? ctx.user.name;

  switch (action.kind) {
    case 'start': {
      if (!action.goalType) return askGoal(brief, null, firstName);
      const next = { ...brief, goalType: action.goalType };
      return result(
        withStep(next, 'goal'),
        GOAL_TYPE_LABELS[action.goalType],
        `Hi ${firstName}. Let’s scope your research. In one sentence, what would a good outcome look like? For example, the decision you need to make and by when.`,
        starterChips(action.goalType),
      );
    }

    case 'goal-type': {
      const next = { ...brief, goalType: action.goalType };
      return result(
        withStep(next, 'goal'),
        GOAL_TYPE_LABELS[action.goalType],
        'Got it. In one sentence, what would a good outcome look like? For example, the decision you need to make and by when.',
        starterChips(action.goalType),
      );
    }

    case 'text':
      return handleText(brief, action.text.trim(), ctx);

    case 'subject-add': {
      if (brief.subjects.some((s) => s.id === action.subject.id)) {
        return result(
          brief,
          null,
          `${action.subject.label} is already in your brief.`,
          subjectsWidget(brief),
        );
      }
      const next = invalidateConfirmation({
        ...brief,
        subjects: [...brief.subjects, action.subject],
      });
      return result(
        withStep(next, 'subject'),
        action.subject.label,
        `Added ${action.subject.label}. Add another, or continue when the focus looks right.`,
        subjectsWidget(next),
      );
    }

    case 'subject-remove': {
      const removed = brief.subjects.find((s) => s.id === action.subjectId);
      const next = { ...brief, subjects: brief.subjects.filter((s) => s.id !== action.subjectId) };
      return result(
        withStep(next, 'subject'),
        null,
        removed ? `Removed ${removed.label}.` : 'Updated your subjects.',
        subjectsWidget(next),
      );
    }

    case 'subjects-done': {
      if (brief.subjects.length === 0) {
        const next = {
          ...brief,
          stepStatus: { ...brief.stepStatus, subject: 'attention' as const },
        };
        return result(
          next,
          null,
          'Add at least one company, industry or region first, so experts know what to focus on.',
          subjectsWidget(next),
        );
      }
      const labels = brief.subjects.map((s) => s.label).join(', ');
      const done = completeStep(brief, 'subject');
      if (done.currentStep === 'summary')
        return showSummary(done, `Focus on ${labels}`, 'Subjects updated.');
      const withQuestions = { ...done, questions: brief.questions.length ? brief.questions : [] };
      return askQuestions(withQuestions, `Focus on ${labels}`);
    }

    case 'questions': {
      const count = action.questions.length;
      if (count < 3 || count > 10) {
        throw new TurnRejected('Choose between 3 and 10 questions.');
      }
      const next = invalidateConfirmation({ ...brief, questions: action.questions });
      const done = completeStep(next, 'questions');
      const userText = `Use these ${count} questions`;
      if (done.currentStep === 'summary') return showSummary(done, userText, 'Questions updated.');
      return askConstraints(done, userText);
    }

    case 'constraints': {
      const { deadline, budgetCredits } = action.constraints;
      if (deadline) {
        const minDate = new Date(ctx.now);
        minDate.setDate(minDate.getDate() + 3);
        if (deadline < isoDate(minDate)) {
          throw new TurnRejected('The deadline must be at least 3 days away. Pick a later date.');
        }
      }
      const next = invalidateConfirmation({ ...brief, constraints: action.constraints });
      const complete = Boolean(deadline) && budgetCredits !== null;
      const done = completeStep(next, 'constraints', complete ? 'done' : 'attention');
      return showSummary(
        done,
        'Constraints set',
        complete ? 'Thanks.' : 'Noted — we’ll suggest a deadline and budget in any quote.',
      );
    }

    case 'skip': {
      if (action.step !== 'constraints') throw new TurnRejected('This step can’t be skipped.');
      const constraints = { deadline: null, budgetCredits: null, depth: 'standard' as const };
      const done = completeStep({ ...brief, constraints }, 'constraints', 'attention');
      return showSummary(
        done,
        'Skip for now',
        'No problem — we’ll suggest a deadline and budget in any quote.',
      );
    }

    case 'confirm-needs': {
      if (brief.questions.length < 3)
        throw new TurnRejected('Add at least 3 questions before confirming.');
      const confirmed: ResearchBrief = completeStep({ ...brief, status: 'confirmed' }, 'summary');
      const coverage = ctx.getCoverage(confirmed);
      const counts = summariseCoverage(coverage.items);
      const reportCount = coverage.reports.length;
      let reply: string;
      if (counts.full === counts.total) {
        reply = `Good news: all ${counts.total} questions are answered by ${reportCount} library ${reportCount === 1 ? 'report' : 'reports'}. You can buy them now — no custom research needed.`;
      } else if (counts.full === 0 && counts.partial === 0) {
        reply = `None of your ${counts.total} questions are answered by the library yet. Custom research with expert interviews would cover all of them.`;
      } else {
        const gaps = [
          counts.partial ? `${counts.partial} partly` : null,
          counts.none ? `${counts.none} not at all yet` : null,
        ].filter(Boolean);
        reply = `${counts.full} of your ${counts.total} questions are fully covered by the library${gaps.length ? `; ${gaps.join(' and ')}` : ''}. See why for each question, then pick how to proceed.`;
      }
      return result(
        withStep(confirmed, 'options'),
        'Confirm needs',
        reply,
        { kind: 'options', coverage },
        [
          'Searching the library',
          `Matching ${counts.total} questions to report sections`,
          'Checking coverage',
        ],
      );
    }

    case 'choose-option': {
      const next = completeStep({ ...brief, chosenOption: action.option }, 'options');
      const labels = {
        library: 'Buy library reports',
        custom: 'Request custom research',
        mix: 'Mix: reports plus custom research',
      };
      const replies = {
        library: 'Here’s your order. Credits are only taken when you confirm.',
        custom:
          'Review what we’ll quote for. Requesting a quote is free — nothing is charged until you accept it.',
        mix: 'You’ll buy the reports that answer covered questions now, and we’ll quote custom research for the rest.',
      };
      return result(withStep(next, 'checkout'), labels[action.option], replies[action.option], {
        kind: 'checkout',
        option: action.option,
      });
    }

    case 'revisit':
      return revisit(brief, action.step, ctx);
  }
}

function revisit(brief: ResearchBrief, step: StepId, ctx: EngineContext): EngineResult {
  if (brief.status === 'submitted')
    throw new TurnRejected('This brief has been submitted and can’t be changed.');
  const lead = `Let’s revisit ${STEP_LABELS[step].label.toLowerCase()}. Your current answers are filled in.`;
  const next = withStep(brief, step);
  switch (step) {
    case 'goal':
      return result(
        next,
        null,
        `${lead} Pick a different goal type or describe the outcome again.`,
        {
          kind: 'goal-types',
          options: ['invest', 'expand', 'market', 'other'],
        },
      );
    case 'subject':
      return result(next, null, lead, subjectsWidget(next));
    case 'questions':
      return result(next, null, lead, { kind: 'questions', suggestions: brief.questions });
    case 'constraints':
      return result(next, null, lead, { kind: 'constraints' });
    case 'summary':
      return result(
        next,
        null,
        'Here’s your research brief again. Edit it or confirm your needs.',
        { kind: 'summary' },
      );
    case 'options':
      return result(next, null, 'Here are your options again.', {
        kind: 'options',
        coverage: ctx.getCoverage(brief),
      });
    default:
      throw new TurnRejected('That step can’t be revisited.');
  }
}

function handleText(brief: ResearchBrief, text: string, ctx: EngineContext): EngineResult {
  const step = brief.currentStep;

  if (GREETING.test(text) || OFF_TOPIC.test(text)) {
    return result(
      brief,
      text,
      `I can only help with scoping your research here. Let’s continue with ${STEP_LABELS[step].label.toLowerCase()}.`,
      currentWidget(brief, ctx),
    );
  }

  switch (step) {
    case 'goal': {
      const goalType = brief.goalType ?? detectGoalType(text);
      if (!goalType) {
        return result(
          brief,
          text,
          'Thanks. Which of these is closest to your goal? It helps me suggest the right questions.',
          { kind: 'goal-types', options: ['invest', 'expand', 'market', 'other'] },
        );
      }
      if (text.split(/\s+/).length < 4) {
        return result(
          { ...brief, goalType },
          text,
          'Could you say a little more? One sentence on the decision and the timing works best.',
          starterChips(goalType),
        );
      }
      const next = invalidateConfirmation({ ...brief, goalType, objective: text });
      const done = completeStep(next, 'goal');
      if (done.currentStep === 'summary') return showSummary(done, text, 'Goal updated.');
      return askSubject(done, text, 'Clear goal.');
    }

    case 'subject': {
      const resolution = resolveSubject(text);
      if (resolution.kind === 'resolved') {
        return runTurn(brief, { kind: 'subject-add', subject: resolution.subject }, ctx);
      }
      if (resolution.kind === 'ambiguous') {
        return result(
          brief,
          text,
          `Did you mean one of these for “${text}”?`,
          subjectsWidget(brief, resolution.candidates, text),
        );
      }
      return result(
        brief,
        text,
        `I couldn’t find “${text}” in our coverage. Pick a close match, or keep it as a custom subject — experts can still research it.`,
        subjectsWidget(brief, resolution.candidates, text),
      );
    }

    case 'questions': {
      // Typed questions join the picker's list; the brief changes only when the list is submitted.
      const question: Question = { id: createId('q'), text, topic: 'custom', source: 'user' };
      const base =
        ctx.lastWidget?.kind === 'questions'
          ? ctx.lastWidget.suggestions
          : brief.questions.length
            ? brief.questions
            : suggestQuestions(brief);
      return result(
        brief,
        text,
        'Added your question to the list. Reorder or untick questions, then continue.',
        {
          kind: 'questions',
          suggestions: [...base, question],
        },
      );
    }

    default:
      return result(
        brief,
        text,
        step === 'summary'
          ? 'To change the brief, use Edit on the summary card — your changes update every step.'
          : `Let’s finish ${STEP_LABELS[step].label.toLowerCase()} first using the options above.`,
        currentWidget(brief, ctx),
      );
  }
}

/** Re-shows the widget for the current step (used after an off-topic message). */
function currentWidget(brief: ResearchBrief, ctx: EngineContext): Widget | null {
  switch (brief.currentStep) {
    case 'goal':
      return brief.goalType
        ? starterChips(brief.goalType)
        : { kind: 'goal-types', options: ['invest', 'expand', 'market', 'other'] };
    case 'subject':
      return subjectsWidget(brief);
    case 'questions':
      return {
        kind: 'questions',
        suggestions: brief.questions.length ? brief.questions : suggestQuestions(brief),
      };
    case 'constraints':
      return { kind: 'constraints' };
    case 'summary':
      return { kind: 'summary' };
    case 'options':
      return { kind: 'options', coverage: ctx.getCoverage(brief) };
    case 'checkout':
      return brief.chosenOption ? { kind: 'checkout', option: brief.chosenOption } : null;
  }
}

export function toMessage(
  role: ChatMessage['role'],
  text: string,
  step: StepId,
  widget: Widget | null,
  now: Date,
): ChatMessage {
  return { id: createId('msg'), role, text, step, widget, createdAt: now.toISOString() };
}
