import type { PersonaId } from '@/features/auth';
import type { ResearchBrief } from './brief.schema';
import type { ChatMessage } from './message.schema';
import { initialStepStatus, type StepId } from './steps';

export type HomeStoryPersona = Extract<PersonaId, 'ayesha' | 'bilal'>;

/** One piece of a home line. Emphasised pieces are the words the cards open. */
export type StoryFragment = {
  text: string;
  emphasis?: boolean;
};

/** Written home copy plus the records the cards and the chat open. */
export type HomeStory = {
  personaId: HomeStoryPersona;
  ownerId: string;
  lines: readonly [readonly StoryFragment[], readonly StoryFragment[]];
  libraryId: string;
  briefId: string;
  requestId: string;
};

function storyLine(...parts: StoryFragment[]): readonly StoryFragment[] {
  return parts;
}

export const HOME_STORIES: Record<HomeStoryPersona, HomeStory> = {
  ayesha: {
    personaId: 'ayesha',
    ownerId: 'usr_ayesha',
    lines: [
      storyLine(
        { text: 'A new report is in the library on ' },
        { text: 'GCC specialty coffee', emphasis: true },
        { text: ': ' },
        { text: 'growth, pricing and competition', emphasis: true },
        { text: '.' },
      ),
      storyLine(
        { text: 'Your ' },
        { text: 'Qahwa House', emphasis: true },
        { text: ' brief already has a ' },
        { text: 'library answer', emphasis: true },
        { text: ', and the quote for ' },
        { text: 'custom research', emphasis: true },
        { text: ' is ready to review.' },
      ),
    ],
    libraryId: 'lib_gcc_coffee_2026',
    briefId: 'brf_ayesha_qahwa',
    requestId: 'req_qahwa_pipeline',
  },
  bilal: {
    personaId: 'bilal',
    ownerId: 'usr_bilal',
    lines: [
      storyLine(
        { text: 'A new report is in the library on supplying a ' },
        { text: 'café in Riyadh', emphasis: true },
        { text: ', including ' },
        { text: 'fit-out costs and lead times', emphasis: true },
        { text: '.' },
      ),
      storyLine(
        { text: 'Your ' },
        { text: 'second-café', emphasis: true },
        { text: ' brief already has a ' },
        { text: 'library answer', emphasis: true },
        { text: ', and recruiting has started on the ' },
        { text: 'fit-out request', emphasis: true },
        { text: '.' },
      ),
    ],
    libraryId: 'lib_riyadh_cafe_supply',
    briefId: 'brf_bilal_riyadh',
    requestId: 'req_riyadh_fitout',
  },
};

export function homeStoryFor(personaId: PersonaId | null | undefined): HomeStory | null {
  if (personaId === 'ayesha' || personaId === 'bilal') return HOME_STORIES[personaId];
  return null;
}

const STORY_BRIEF_IDS = new Set(Object.values(HOME_STORIES).map((story) => story.briefId));

/** A seeded home brief: the thread is a script, played back instead of the live stepper. */
export function isHomeStoryBrief(briefId: string): boolean {
  return STORY_BRIEF_IDS.has(briefId);
}

const minutesAgo = (now: Date, minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString();

function storyBrief(
  story: HomeStory,
  now: Date,
  fields: Pick<ResearchBrief, 'title' | 'goalType' | 'objective' | 'subjects' | 'questions'>,
): ResearchBrief {
  return {
    id: story.briefId,
    ownerId: story.ownerId,
    status: 'draft',
    currentStep: 'options',
    stepStatus: {
      ...initialStepStatus(),
      goal: 'done',
      subject: 'done',
      questions: 'done',
      constraints: 'done',
      summary: 'done',
      options: 'active',
    },
    constraints: { deadline: null, budgetCredits: null, depth: null },
    chosenOption: null,
    aiSnapshot: null,
    isEditedByUser: false,
    createdAt: minutesAgo(now, 50),
    updatedAt: minutesAgo(now, 20),
    ...fields,
  };
}

function thread(
  briefId: string,
  now: Date,
  turns: { role: ChatMessage['role']; text: string; step: StepId; widget: ChatMessage['widget'] }[],
): ChatMessage[] {
  return turns.map((turn, index) => ({
    id: `${briefId}_${index + 1}`,
    role: turn.role,
    text: turn.text,
    step: turn.step,
    widget: turn.widget,
    createdAt: minutesAgo(now, 90 - index * 5),
  }));
}

const STORY_SOURCES = [
  { label: 'Library reports', percent: 44 },
  { label: 'Secondary internet data', percent: 12 },
  { label: 'Expert interviews', percent: 32 },
  { label: 'Still open', percent: 12 },
] as const;

/** Seeded briefs and their chats. A new brief from the ask field is unaffected. */
export function seedHomeStories(now = new Date()): {
  briefs: Record<string, ResearchBrief>;
  messages: Record<string, ChatMessage[]>;
} {
  const ayesha = HOME_STORIES.ayesha;
  const bilal = HOME_STORIES.bilal;

  const ayeshaBrief = storyBrief(ayesha, now, {
    title: 'Qahwa House funding round',
    goalType: 'invest',
    objective:
      'Decide whether to join Qahwa House’s next funding round by judging how sustainable its store growth is.',
    subjects: [
      {
        id: 'co_qahwa_house',
        kind: 'company',
        label: 'Qahwa House',
        detail: 'Specialty coffee chain · KSA, UAE · 140 stores',
      },
      { id: 'rg_gcc', kind: 'region', label: 'GCC', detail: 'Gulf Cooperation Council' },
    ],
    questions: [
      {
        id: 'q1',
        text: 'How have Qahwa House sales trended over the last 3 years?',
        topic: 'sales-trend',
        source: 'user',
      },
      {
        id: 'q2',
        text: 'Which competitors are gaining share from Qahwa House, and why?',
        topic: 'competition',
        source: 'user',
      },
      {
        id: 'q3',
        text: 'How do new stores perform against the established estate?',
        topic: 'growth-drivers',
        source: 'user',
      },
      {
        id: 'q4',
        text: 'What are the main operational and supplier risks?',
        topic: 'operational-risk',
        source: 'user',
      },
    ],
  });

  const bilalBrief = storyBrief(bilal, now, {
    title: 'Second café in north Riyadh',
    goalType: 'expand',
    objective: 'Decide whether to open a second franchise café in north Riyadh next year.',
    subjects: [{ id: 'rg_riyadh', kind: 'region', label: 'Riyadh', detail: 'City · Saudi Arabia' }],
    questions: [
      {
        id: 'q1',
        text: 'What does fit-out cost for a 100–150 m² café in Riyadh?',
        topic: 'setup-costs',
        source: 'user',
      },
      {
        id: 'q2',
        text: 'How long do equipment orders take to arrive?',
        topic: 'lead-times',
        source: 'user',
      },
      {
        id: 'q3',
        text: 'Which permits do I need before opening, and how long do they take?',
        topic: 'licensing',
        source: 'user',
      },
      {
        id: 'q4',
        text: 'Which suppliers do franchisees use for coffee and bakery?',
        topic: 'suppliers',
        source: 'user',
      },
    ],
  });

  return {
    briefs: {
      [ayesha.briefId]: ayeshaBrief,
      [bilal.briefId]: bilalBrief,
    },
    messages: {
      [ayesha.briefId]: thread(ayesha.briefId, now, [
        {
          role: 'user',
          step: 'goal',
          widget: null,
          text: 'Should we join Qahwa House’s next funding round?',
        },
        {
          role: 'assistant',
          step: 'goal',
          widget: null,
          text: 'I’ll take that as the goal: decide whether to join the round. Which company and region should I pin it to?',
        },
        {
          role: 'user',
          step: 'subject',
          widget: null,
          text: 'Qahwa House, across the GCC, looking at the next twelve months.',
        },
        {
          role: 'assistant',
          step: 'subject',
          widget: null,
          text: 'Subject set: Qahwa House, GCC. What do you need to be sure of before you commit?',
        },
        {
          role: 'user',
          step: 'questions',
          widget: null,
          text: 'Sales trend, who is taking share, whether new stores hold up, and the supplier risks.',
        },
        {
          role: 'assistant',
          step: 'questions',
          widget: null,
          text: 'I’ll use these four. How have sales trended over the last 3 years? Which competitors are gaining share, and why? How do new stores perform against the established estate? What are the main operational and supplier risks? Does that cover the decision?',
        },
        {
          role: 'user',
          step: 'questions',
          widget: null,
          text: 'Yes, those four.',
        },
        {
          role: 'assistant',
          step: 'options',
          widget: {
            kind: 'library-search',
            steps: [
              'Searching GCC specialty coffee',
              'Reading 9 expert interviews',
              'Matching your four questions',
            ],
          },
          text: 'I’ll look through the library and the interviews behind it.',
        },
        {
          role: 'assistant',
          step: 'options',
          widget: {
            kind: 'report-artifact',
            reportId: ayesha.libraryId,
            title: 'GCC specialty coffee 2026: growth, pricing and competition',
            finding:
              'The library answers the market headline. Store-level performance of the next sites is still open.',
            sources: [...STORY_SOURCES],
          },
          text: 'Here is the report. It answers 88% of the goal. The open 12% is what custom research would cover.',
        },
        {
          role: 'user',
          step: 'options',
          widget: null,
          text: 'Is that enough to decide the round?',
        },
        {
          role: 'assistant',
          step: 'options',
          widget: {
            kind: 'custom-request',
            requestId: ayesha.requestId,
            gap: 'Store-level performance of the next sites, and supplier risk, are the open 12%.',
          },
          text: 'Not for the round itself. The report covers growth, share and pricing. The next sites and supplier risk are not in it. For that depth, request custom research.',
        },
      ]),
      [bilal.briefId]: thread(bilal.briefId, now, [
        {
          role: 'user',
          step: 'goal',
          widget: null,
          text: 'Can I open a second café in north Riyadh next year?',
        },
        {
          role: 'assistant',
          step: 'goal',
          widget: null,
          text: 'I’ll take that as the goal: a go or no-go on a second site. Where, and what kind of café?',
        },
        {
          role: 'user',
          step: 'subject',
          widget: null,
          text: 'A franchise café in north Riyadh, about 120 square metres.',
        },
        {
          role: 'assistant',
          step: 'subject',
          widget: null,
          text: 'Subject set: Riyadh, franchise café. What has to be true before you sign?',
        },
        {
          role: 'user',
          step: 'questions',
          widget: null,
          text: 'Fit-out cost, equipment lead times, permits, and who supplies coffee and bakery.',
        },
        {
          role: 'assistant',
          step: 'questions',
          widget: null,
          text: 'I’ll use these four. What does fit-out cost for a café that size? How long do equipment orders take? Which permits do you need, and how long do they take? Which suppliers do franchisees use for coffee and bakery? Does that cover the decision?',
        },
        {
          role: 'user',
          step: 'questions',
          widget: null,
          text: 'Yes, those four.',
        },
        {
          role: 'assistant',
          step: 'options',
          widget: {
            kind: 'library-search',
            steps: [
              'Searching Riyadh café supply',
              'Reading 7 expert interviews',
              'Matching your four questions',
            ],
          },
          text: 'I’ll look through the library and the interviews behind it.',
        },
        {
          role: 'assistant',
          step: 'options',
          widget: {
            kind: 'report-artifact',
            reportId: bilal.libraryId,
            title: 'Supplying a café in Riyadh: suppliers, lead times and costs',
            finding:
              'The library answers the headline on cost and lead times. A named site and your supplier list are still open.',
            sources: [...STORY_SOURCES],
          },
          text: 'Here is the report. It answers 88% of the goal. The open 12% is what custom research would cover.',
        },
        {
          role: 'user',
          step: 'options',
          widget: null,
          text: 'What about my specific site?',
        },
        {
          role: 'assistant',
          step: 'options',
          widget: {
            kind: 'custom-request',
            requestId: bilal.requestId,
            gap: 'A named site and your supplier list are the open 12%.',
          },
          text: 'A named site and your supplier list are not in the library. For that depth, request custom research.',
        },
      ]),
    },
  };
}
