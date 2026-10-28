import type {
  AvailabilityBundle,
  BookedProject,
  CallWorkspace,
  ClientSend,
  FormQuestion,
  MailMessage,
  OutreachCampaign,
  Pitch,
  PitchRecipient,
  Project,
  QuestionnaireResponse,
  ResponsesBundle,
  Shortlist,
} from '@/features/admin';
import { createId } from '@/shared/lib/id';

const SCREENING: Omit<FormQuestion, 'id' | 'number'>[] = [
  { text: 'Current employer and role', kind: 'short', source: 'screening', locked: false },
  {
    text: 'Worked for a battery recycler in the last 3 years?',
    kind: 'yes_no',
    source: 'screening',
    locked: false,
  },
  { text: 'Conflict of interest?', kind: 'yes_no', source: 'screening', locked: false },
  { text: 'Availability in next 2 weeks?', kind: 'short', source: 'screening', locked: false },
  { text: 'Hourly rate (USD)', kind: 'number', source: 'screening', locked: false },
  { text: 'Languages', kind: 'short', source: 'screening', locked: false },
  {
    text: 'I agree to confidentiality and compliance terms',
    kind: 'checkbox',
    source: 'screening',
    locked: false,
  },
];

const SAMPLE_ANSWERS: Record<string, string> = {
  q1: 'Around 50–60 kt of EV packs are collected in the EU today; we expect 250–300 kt by 2030 if collection rates hold.',
  q2: 'Most black mass still comes from Asia; EU feedstock is tight and controlled by a handful of collectors.',
  q3: 'Hydro plants typically recover 90%+ of Ni/Co at higher opex; pyro is cheaper to run but loses lithium.',
  q4: '',
  q5: 'Northvolt Revolt, Redwood and Cirba are the clearest scale plays; differentiation is feedstock access.',
  q6: 'OEMs pay on a per-tonne or per-pack basis with take-or-pay floors; multi-year contracts are the norm.',
  q7: 'Permitting, electricity price and skilled labour are the three scaling risks that kill timelines.',
  q8: 'Asian recyclers will partner rather than greenfield — JV with local collectors is the pattern.',
};

export function buildPitch(
  project: Project,
  shortlist: Shortlist,
  selectedIds: string[],
  now: Date,
): Pitch {
  const selected = shortlist.experts.filter((e) => selectedIds.includes(e.id));
  const recipients: PitchRecipient[] = selected.map((e) => ({
    id: e.id,
    displayId: e.label,
    country: e.country,
    matchPercent: e.matchPercent,
    role: e.role,
  }));
  const clientQs: FormQuestion[] = project.questions.map((q, i) => ({
    id: q.id,
    number: i + 1,
    text: q.text,
    kind: 'long' as const,
    source: 'client' as const,
    locked: true,
  }));
  const screeningQs: FormQuestion[] = SCREENING.map((q, i) => ({
    ...q,
    id: `sq_${i + 1}`,
    number: clientQs.length + i + 1,
  }));
  const subject = `Paid 60-min consultation: ${shortProjectName(project.name)}`;
  const body = [
    'Hi {first name},',
    '',
    'We’re supporting an investment firm researching the European EV battery recycling market.',
    '{why we picked you}',
    '',
    'This is a paid 60-minute consultation. Please answer the 15 questions on the private link below — it expires in 48 hours.',
    '',
    'Answer the 15 questions →',
  ].join('\n');
  return {
    projectId: project.id,
    subject,
    body,
    ai: { subject, body },
    answerByHours: 48,
    reminder: 'email_sms_24h',
    hideClientName: true,
    askCompliance: true,
    questions: [...clientQs, ...screeningQs],
    recipients,
    sentAt: null,
    updatedAt: now.toISOString(),
  };
}

export function buildResponsesAfterSend(
  project: Project,
  pitch: Pitch,
  now: Date,
): { bundle: ResponsesBundle; links: { token: string; expertId: string; expiresAt: string }[] } {
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60_000).toISOString();
  const responses: QuestionnaireResponse[] = pitch.recipients.map((r, index) => {
    const token = `lnk_form_${project.id}_${r.id}`;
    const submitted = index < 6;
    const answers = pitch.questions.map((q) => {
      const text = submitted && q.source === 'client' ? (SAMPLE_ANSWERS[q.id] ?? '') : '';
      const cantSpeak = submitted && q.id === 'q4';
      return {
        questionId: q.id,
        text: cantSpeak ? '' : text,
        cantSpeak,
        wordCount: cantSpeak ? 0 : text.split(/\s+/).filter(Boolean).length,
      };
    });
    const answered = answers.filter((a) => a.cantSpeak || a.text.trim().length > 0).length;
    const coverage = answers
      .filter((a) => a.text.trim().length > 0 && !a.cantSpeak)
      .map((a) => a.questionId)
      .slice(0, 6);
    return {
      id: `resp_${r.id}`,
      projectId: project.id,
      expertId: r.id,
      displayId: r.displayId,
      role: r.role,
      country: r.country,
      status: submitted ? 'submitted' : 'invited',
      answered: submitted ? answered : 0,
      total: pitch.questions.length,
      quality: submitted ? 72 + ((index * 3) % 20) : null,
      coverage,
      complianceSigned: submitted && index !== 3,
      selected: false,
      answers,
      submittedAt: submitted ? new Date(now.getTime() - (6 - index) * 60_000).toISOString() : null,
      linkToken: token,
      expiresAt,
    };
  });
  const submitted = responses.filter((r) => r.status === 'submitted');
  const aiPickIds = submitted
    .slice()
    .sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0))
    .slice(0, 5)
    .map((r) => r.expertId);
  for (const r of responses) {
    r.selected = aiPickIds.includes(r.expertId);
  }
  return {
    bundle: {
      projectId: project.id,
      invited: responses.length,
      submitted: submitted.length,
      aiPickIds,
      responses,
    },
    links: responses.map((r) => ({
      token: r.linkToken,
      expertId: r.expertId,
      expiresAt: r.expiresAt,
    })),
  };
}

const SLOT_LABELS = [
  ['Tue 27 · 14:00', 'Thu 29 · 15:00'],
  ['Mon 26 · 10:00', 'Wed 28 · 16:00'],
  ['Tue 27 · 11:00', 'Fri 30 · 09:00'],
  ['Wed 28 · 12:00', 'Thu 29 · 10:00'],
  ['Mon 26 · 15:00', 'Fri 30 · 13:00'],
];

export function buildAvailability(
  project: Project,
  bundle: ResponsesBundle,
  now: Date,
): AvailabilityBundle {
  const selected = bundle.responses.filter((r) => r.selected).slice(0, 5);
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const experts = selected.map((r, i) => ({
    expertId: r.expertId,
    displayId: r.displayId,
    role: r.role,
    status: 'confirmed' as const,
    complianceSigned: r.complianceSigned,
    letter: letters[i] ?? String(i + 1),
    slots: (SLOT_LABELS[i] ?? SLOT_LABELS[0] ?? []).map((label, j) => ({
      id: `slot_${r.expertId}_${j}`,
      label,
      startsAt: new Date(now.getTime() + (i + j + 2) * 24 * 60 * 60_000).toISOString(),
    })),
  }));
  return {
    projectId: project.id,
    timezone: 'GMT',
    askedAt: now.toISOString(),
    holdHours: 48,
    holdSlots: true,
    confirmed: experts.length,
    waiting: 0,
    declined: 0,
    complianceSigned: experts.filter((e) => e.complianceSigned).length,
    experts,
  };
}

export function buildClientSend(
  project: Project,
  availability: AvailabilityBundle,
  bundle: ResponsesBundle,
  now: Date,
): ClientSend {
  const pickToken = `lnk_pick_${project.id}`;
  const experts = availability.experts.map((e) => {
    const resp = bundle.responses.find((r) => r.expertId === e.expertId);
    const quote =
      resp?.answers.find((a) => a.text.trim().length > 0)?.text.slice(0, 90) ??
      'Strong coverage across the client’s questions.';
    return {
      letter: e.letter,
      expertId: e.expertId,
      headline: e.role,
      years: 12 + (e.letter.charCodeAt(0) % 8),
      country: resp?.country ?? 'EU',
      quote: quote.endsWith('.') ? quote : `${quote}…`,
      bestFor: (resp?.coverage ?? []).slice(0, 2).map((id) => {
        const q = project.questions.find((qq) => qq.id === id);
        return q ? q.text.slice(0, 28) : id;
      }),
      slots: e.slots,
      rate: 450,
    };
  });
  const subject = `${experts.length} experts for ${shortProjectName(project.name)} — pick 1 or 2`;
  const body = [
    `Hi ${project.contact.name.split(' ')[0]} — we screened the network and these ${experts.length} answered your questions best.`,
    'Each one is free for a 60-minute call next week. Pick 1 or 2 and we’ll book it.',
    '',
    'Choose your experts →',
  ].join('\n');
  return {
    projectId: project.id,
    to: { name: project.contact.name, email: project.contact.email },
    cc: [{ name: 'Mark Huang', email: 'mark.huang@helixcap.example' }],
    subject,
    body,
    ai: { subject, body },
    experts,
    hideNames: true,
    includeSummaries: true,
    pickLimit: 2,
    showRates: false,
    replyBy: new Date(now.getTime() + 2 * 24 * 60 * 60_000).toISOString(),
    coverage: project.questions.map((q, i) => ({
      questionId: q.id,
      label: `Q${i + 1}: ${q.text.slice(0, 40)}`,
      letters: experts
        .filter((_, ei) => (ei + i) % 3 !== 2)
        .map((e) => e.letter)
        .slice(0, 2),
    })),
    pickToken,
    sentAt: null,
    clientNote: null,
    picks: null,
    syncedAt: null,
  };
}

export function buildBooked(project: Project, clientSend: ClientSend, now: Date): BookedProject {
  const picks = clientSend.picks ?? [];
  const bookings = picks.map((p) => {
    const card = clientSend.experts.find((e) => e.expertId === p.expertId);
    const slot = card?.slots.find((s) => s.id === p.slotId) ?? card?.slots[0];
    return {
      id: createId('bk'),
      projectId: project.id,
      expertId: p.expertId,
      displayId: card ? `Expert ${card.letter}` : p.expertId,
      letter: p.letter,
      role: card?.headline ?? 'Expert',
      slot: slot ?? { id: 'slot_x', label: 'TBD', startsAt: now.toISOString() },
      status: 'confirmed' as const,
      inviteLink: `https://meet.xpertnetwork.example/${project.id}/${p.expertId}`,
      briefingReady: true,
    };
  });
  return {
    projectId: project.id,
    lockedAt: now.toISOString(),
    version: 'v1.0',
    checklist: [
      { id: 'c1', label: 'Experts confirmed and invites sent', done: true },
      { id: 'c2', label: 'Client notified with locked times', done: true },
      { id: 'c3', label: 'Briefing pack ready (send 24 h before)', done: true },
      { id: 'c4', label: 'Standby experts released', done: true },
    ],
    bookings,
    briefingPack:
      'Anonymised brief, client questions, compliance reminder, and dial-in details for each booked call.',
  };
}

export function buildCallWorkspace(project: Project, now: Date): CallWorkspace {
  return {
    id: `call_${project.id}_1`,
    projectId: project.id,
    title: `${shortProjectName(project.name)} · Call 1`,
    expertLetter: 'A',
    expertRole: 'Former VP Operations',
    status: 'live',
    startedAt: now.toISOString(),
    transcript: [
      {
        id: 't1',
        speaker: 'client',
        text: 'Can you walk us through typical recovery rates for hydro plants in the EU?',
        at: now.toISOString(),
      },
      {
        id: 't2',
        speaker: 'expert',
        text: 'For nickel and cobalt you’re looking at mid-90s percent if the flowsheet is tuned…',
        at: now.toISOString(),
      },
      {
        id: 't3',
        speaker: 'ai',
        text: 'Detected: client asked for a plant opex benchmark document.',
        at: now.toISOString(),
      },
    ],
    requests: [
      {
        id: 'cr1',
        kind: 'document',
        text: 'Send plant opex benchmark PDF after the call',
        at: now.toISOString(),
      },
    ],
    questionsCovered: project.questions.slice(0, 8).map((q, i) => ({
      id: q.id,
      label: `Q${i + 1}`,
      covered: i < 3,
    })),
    documents: [{ id: 'd1', name: 'Opex_benchmark_draft.pdf', kind: 'pdf' }],
  };
}

export function buildOutreachCampaign(project: Project, now: Date): OutreachCampaign {
  return {
    projectId: project.id,
    status: 'draft',
    blockingRequirement: 'Hands-on EU battery recycling plant leadership (5+ years)',
    closest: [
      {
        id: 'exp_near_1',
        role: 'Battery materials analyst',
        misses: 'No plant ops experience',
      },
      {
        id: 'exp_near_2',
        role: 'EV supply-chain lead',
        misses: 'Asia-only footprint',
      },
      {
        id: 'exp_near_3',
        role: 'Waste management director',
        misses: 'Not batteries / black mass',
      },
    ],
    poster: {
      headline: `Former plant leaders — ${shortProjectName(project.name)}`,
      projectSummary: project.brief.slice(0, 280),
      category: 'Battery recycling / circular materials',
      experience: '8+ years plant or feedstock leadership',
      region: 'EU / UK',
      count: 4,
      pay: '$400–600 / hour · 60 min',
      deadline: new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString().slice(0, 10),
      mustHaves: [
        'EU battery recycling or black-mass experience',
        'Can speak to recovery rates and opex',
        'No current employment at the target company',
      ],
      howToApply: `Email experts@xpertnetwork.example with subject ${project.id} and your CV.`,
    },
    clientUpdateSentAt: null,
    applicants: [
      {
        id: 'app_1',
        name: 'Katarzyna Wójcik',
        email: 'k.wojcik@example.com',
        tag: 'fits_all',
        fits: 'Fits 3/3',
        cvName: 'Wojcik_CV.pdf',
        selected: true,
        complianceOk: true,
      },
      {
        id: 'app_2',
        name: 'Lars Madsen',
        email: 'lars.madsen@example.com',
        tag: 'fits_all',
        fits: 'Fits 3/3',
        cvName: 'Madsen_CV.pdf',
        selected: true,
        complianceOk: true,
      },
      {
        id: 'app_3',
        name: 'Inès Moreau',
        email: 'ines.moreau@example.com',
        tag: 'fits_partial',
        fits: 'Fits 2/3',
        cvName: 'Moreau_CV.pdf',
        selected: true,
        complianceOk: true,
      },
      {
        id: 'app_4',
        name: 'Jonas Berg',
        email: 'jonas.berg@example.com',
        tag: 'fits_partial',
        fits: 'Fits 2/3',
        cvName: 'Berg_CV.pdf',
        selected: true,
        complianceOk: true,
      },
      {
        id: 'app_5',
        name: 'Mei Chen',
        email: 'mei.chen@example.com',
        tag: 'conflict',
        fits: 'Conflict',
        cvName: 'Chen_CV.pdf',
        selected: false,
        complianceOk: false,
      },
      {
        id: 'app_6',
        name: 'Tom Hale',
        email: 'tom.hale@example.com',
        tag: 'not_a_fit',
        fits: 'Not a fit',
        cvName: 'Hale_CV.pdf',
        selected: false,
        complianceOk: true,
      },
      {
        id: 'app_7',
        name: 'Sofia Ricci',
        email: 'sofia.ricci@example.com',
        tag: 'fits_all',
        fits: 'Fits 3/3',
        cvName: 'Ricci_CV.pdf',
        selected: true,
        complianceOk: true,
      },
      {
        id: 'app_8',
        name: 'Owen Blake',
        email: 'owen.blake@example.com',
        tag: 'fits_partial',
        fits: 'Fits 2/3',
        cvName: 'Blake_CV.pdf',
        selected: false,
        complianceOk: true,
      },
    ],
    questionsSentAt: null,
    topIds: [],
    onboardedIds: [],
    publishedAt: null,
  };
}

export function mailOut(
  partial: Omit<MailMessage, 'id' | 'direction' | 'sentAt'> & { sentAt?: string },
  now: Date,
): MailMessage {
  return {
    id: createId('mail'),
    direction: 'out',
    sentAt: partial.sentAt ?? now.toISOString(),
    ...partial,
  };
}

function shortProjectName(name: string) {
  const dash = name.indexOf('—');
  if (dash > 0) return name.slice(0, dash).trim();
  return name;
}
