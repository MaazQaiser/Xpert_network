'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, InlineNotification, ProgressBar, Search, SkeletonText } from '@carbon/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckmarkFilled,
  CircleDash,
  DocumentPdf,
  Document,
  DataTable as SpreadsheetIcon,
} from '@carbon/icons-react';
import { Envelope as EmailPictogram } from '@carbon/pictograms-react';
import { AIExplainLabel } from '@/shared/ai';
import { routes } from '@/shared/config/routes';
import { AsyncBoundary, EmptyState } from '@/shared/ui';
import { useInbox, useProject } from '../../api/queries';
import {
  INBOX_VIEW_LABELS,
  INBOX_VIEWS,
  inView,
  matchesSearch,
  parseInboxView,
  type InboxRequest,
  type InboxView,
} from '../../model/inbox.schema';
import { attachmentLine, InboxStatusTag, initials, receivedLabel } from '../inboxDisplay';
import { SourceDocument } from '../SourceDocument/SourceDocument';
import styles from './Inbox.module.scss';

const INBOX_ADDRESS = 'projects@xpertnetwork.example';

/** PRD screen 02: incoming client emails, with what the AI did to each. */
export function Inbox({ selectedId = null }: { selectedId?: string | null }) {
  return (
    <Suspense>
      <InboxBody selectedId={selectedId} />
    </Suspense>
  );
}

function InboxBody({ selectedId }: { selectedId: string | null }) {
  const inbox = useInbox();
  return (
    <AsyncBoundary
      query={inbox}
      errorTitle="The inbox didn’t load"
      loading={<InboxSkeleton />}
      isEmpty={(data) => data.length === 0}
      empty={
        <EmptyState
          pictogram={<EmailPictogram aria-hidden="true" />}
          title="No client emails yet"
          description={`The AI watches ${INBOX_ADDRESS}. When a client emails a brief, it reads the email and any attachment, then drafts a project file for you here.`}
        />
      }
    >
      {(requests) => <InboxLayout requests={requests} selectedId={selectedId} />}
    </AsyncBoundary>
  );
}

function InboxSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label="Loading the inbox">
      <div className={styles.listPane}>
        <SkeletonText heading width="60%" />
        {[0, 1, 2, 3].map((i) => (
          <SkeletonText key={i} paragraph lineCount={3} />
        ))}
      </div>
      <div className={styles.readingPane}>
        <SkeletonText heading width="70%" />
        <SkeletonText paragraph lineCount={8} />
      </div>
    </div>
  );
}

function InboxLayout({
  requests,
  selectedId,
}: {
  requests: InboxRequest[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = parseInboxView(params.get('view'));
  const query = params.get('q') ?? '';
  const search = params.toString();
  const shown = requests.filter((r) => inView(r, view) && matchesSearch(r, query));
  const selected = requests.find((r) => r.id === selectedId) ?? (selectedId ? undefined : shown[0]);
  const processing = requests.filter((r) => r.status === 'reading' || r.status === 'extracting');

  const setParam = (key: 'view' | 'q', value: string) => {
    const next = new URLSearchParams(search);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const hrefFor = (id: string) => `${routes.admin.inboxRequest(id)}${search ? `?${search}` : ''}`;

  return (
    <div className={`${styles.layout} ${selectedId ? styles.hasSelection : ''}`}>
      <section className={styles.listPane} aria-labelledby="inbox-title">
        <header className={styles.listHeader}>
          <h1 id="inbox-title" className={styles.title}>
            Incoming requests
          </h1>
          <p className={styles.subtitle}>
            AI opens every email and attachment the moment it lands, then drafts a project file.
          </p>
          <p className={styles.agent}>
            <span className={styles.liveDot} aria-hidden="true" />
            AI agent live · Watching {INBOX_ADDRESS} ·{' '}
            {processing.length === 1
              ? '1 email processing now'
              : `${processing.length} emails processing now`}
          </p>
        </header>
        <Search
          size="md"
          labelText="Search requests"
          placeholder="Search by sender, company, subject or file"
          defaultValue={query}
          onChange={(event) => setParam('q', event.target.value)}
          closeButtonLabelText="Clear search"
        />
        <div className={styles.views} role="group" aria-label="Show">
          {INBOX_VIEWS.map((option) => (
            <ViewButton
              key={option}
              view={option}
              isActive={view === option}
              count={requests.filter((r) => inView(r, option)).length}
              onSelect={() => setParam('view', option)}
            />
          ))}
        </div>
        {shown.length === 0 ? (
          <p className={styles.noResults} role="status">
            No requests match. Clear the search or choose another view.
          </p>
        ) : (
          <ul className={styles.list} aria-label="Requests">
            {shown.map((request) => (
              <li key={request.id}>
                <Link
                  href={hrefFor(request.id)}
                  className={`${styles.row} ${request.id === selected?.id ? styles.rowSelected : ''}`}
                  aria-current={request.id === selected?.id ? 'true' : undefined}
                  scroll={false}
                >
                  <span className={styles.rowTop}>
                    <span className={styles.sender}>
                      {request.from.name}
                      <span className={styles.company}> · {request.company}</span>
                    </span>
                    <time className={styles.time} dateTime={request.receivedAt}>
                      {receivedLabel(request.receivedAt)}
                    </time>
                  </span>
                  <span className={styles.subject}>{request.subject}</span>
                  <span className={styles.rowBottom}>
                    <span className={styles.file}>{attachmentLine(request)}</span>
                    <span className={styles.rowStatus}>
                      <InboxStatusTag request={request} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.readingPane} aria-label="Selected request">
        {selected ? (
          <ReadingPane
            request={selected}
            backHref={`${routes.admin.inbox}${search ? `?${search}` : ''}`}
          />
        ) : (
          <EmptyState
            pictogram={<EmailPictogram aria-hidden="true" />}
            title="We couldn’t find that email"
            description="It may have been moved or deleted. Choose another request from the list."
          />
        )}
      </section>
    </div>
  );
}

function ViewButton({
  view,
  isActive,
  count,
  onSelect,
}: {
  view: InboxView;
  isActive: boolean;
  count: number;
  onSelect: () => void;
}) {
  return (
    <Button
      kind="tertiary"
      size="sm"
      className={`${styles.view} ${isActive ? styles.viewActive : ''}`}
      aria-pressed={isActive}
      onClick={onSelect}
    >
      {INBOX_VIEW_LABELS[view]} <span className={styles.count}>{count}</span>
    </Button>
  );
}

function FileIcon({ kind }: { kind: 'pdf' | 'docx' | 'xlsx' }) {
  if (kind === 'pdf') return <DocumentPdf size={24} aria-hidden={true} />;
  if (kind === 'xlsx') return <SpreadsheetIcon size={24} aria-hidden={true} />;
  return <Document size={24} aria-hidden={true} />;
}

function ReadingPane({ request, backHref }: { request: InboxRequest; backHref: string }) {
  const done = request.steps.filter((s) => s.done).length;
  const file = request.attachment;
  const projectHref = request.projectId ? routes.admin.project(request.projectId) : null;

  return (
    <article className={styles.reading} aria-labelledby="request-subject">
      <Link href={backHref} className={styles.back}>
        <ArrowLeft aria-hidden={true} /> All requests
      </Link>
      <header className={styles.readingHeader}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(request.from.name)}
        </span>
        <div className={styles.readingTitle}>
          <h2 id="request-subject" className={styles.subjectLarge}>
            {request.subject}
          </h2>
          <p className={styles.from}>
            <strong>{request.from.name}</strong> &lt;{request.from.email}&gt; → {request.to} ·{' '}
            {receivedLabel(request.receivedAt)}
          </p>
        </div>
        <div className={styles.readingActions}>
          <InboxStatusTag request={request} size="md" />
          {projectHref && request.status === 'brief_ready' ? (
            <Button as={Link} href={projectHref} renderIcon={ArrowRight}>
              Open project file
            </Button>
          ) : projectHref ? (
            <Button as={Link} href={projectHref} kind="tertiary" renderIcon={ArrowRight}>
              Open {request.projectId}
            </Button>
          ) : null}
        </div>
      </header>

      {request.confirmations.length > 0 && request.status === 'brief_ready' ? (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={`${request.confirmations.length} things need confirming:`}
          subtitle={request.confirmations.join(' · ')}
        />
      ) : null}
      {request.status === 'cant_open' && file ? (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Can’t open the file:"
          subtitle={`${file.name} is password-protected. We never try to open protected files. Ask ${request.from.name.split(' ')[0]} for an unlocked copy.`}
        />
      ) : null}

      <blockquote className={styles.body}>“{request.body}”</blockquote>

      {request.autoReply ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <AIExplainLabel
              summary="The AI replied because the email had no brief to work from."
              basis="The email had no attachment and too little detail to draft a project file"
              aria-label="Automatic reply"
            />
            <h3 className={styles.panelTitle}>AI replied automatically</h3>
          </div>
          <p className={styles.autoReply}>{request.autoReply}</p>
        </div>
      ) : null}

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <AIExplainLabel
            summary="Every step the AI took on this email, in order."
            basis="The email, its attachment and your client list"
            aria-label="What the system did"
          />
          <h3 className={styles.panelTitle}>What the system did</h3>
          <span className={styles.panelMeta}>
            {done} of {request.steps.length} done
          </span>
        </div>
        <ol className={styles.steps}>
          {request.steps.map((step) => (
            <li key={step.label} className={step.done ? styles.stepDone : styles.stepPending}>
              {step.done ? (
                <CheckmarkFilled aria-label="Done" className={styles.stepIcon} />
              ) : (
                <CircleDash aria-label="Not done yet" className={styles.stepIcon} />
              )}
              <span className={styles.stepLabel}>{step.label}</span>
              <span className={styles.stepTime}>{step.at ? receivedLabel(step.at) : 'now'}</span>
            </li>
          ))}
        </ol>
      </div>

      {file ? (
        <div className={styles.panel}>
          <div className={styles.fileRow}>
            <FileIcon kind={file.kind} />
            <div>
              <p className={styles.fileName}>{file.name}</p>
              <p className={styles.panelMeta}>
                {[file.size, file.pages ? `${file.pages} pages` : null, file.note]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
          {file.progress != null ? (
            <ProgressBar
              label={
                request.status === 'extracting' ? 'Extracting text (OCR)' : 'Reading the document'
              }
              helperText={`${file.progress}% done`}
              value={file.progress}
            />
          ) : request.projectId && file.kind === 'pdf' ? (
            <AttachmentPreview projectId={request.projectId} fileName={file.name} />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function AttachmentPreview({ projectId, fileName }: { projectId: string; fileName: string }) {
  const project = useProject(projectId);
  const [page, setPage] = useState(1);
  if (!project.data) return null;
  const { document } = project.data;
  return (
    <SourceDocument
      title="Preview"
      fileName={fileName}
      pages={document.pages}
      pageCount={document.pageCount}
      page={page}
      onPageChange={setPage}
    />
  );
}
