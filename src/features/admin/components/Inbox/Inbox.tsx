'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  IconButton,
  InlineNotification,
  ProgressBar,
  Search,
  MenuButton,
  MenuItem,
  MenuItemDivider,
  MenuItemRadioGroup,
  SelectableTag,
  SkeletonText,
} from '@carbon/react';
import {
  Add,
  ArrowLeft,
  ArrowRight,
  Attachment,
  Email,
  EmailNew,
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
import { useInbox, useMailAccounts, useMarkInboxRead, useProject } from '../../api/queries';
import {
  INBOX_VIEW_LABELS,
  INBOX_VIEWS,
  inView,
  matchesSearch,
  parseInboxView,
  type InboxRequest,
} from '../../model/inbox.schema';
import {
  dateTimeLabel,
  fullDateLabel,
  InboxStatusTag,
  initials,
  receivedLabel,
  senderPhoto,
  stepTimeLabel,
} from '../inboxDisplay';
import { SourceDocument } from '../SourceDocument/SourceDocument';
import { AddAccountModal } from './AddAccountModal';
import styles from './Inbox.module.scss';

const INBOX_ADDRESS = 'projects@xpertnetwork.example';

/** "partners@xpertnetwork.example" → "Partners inbox", short enough for the switcher menu. */
function mailboxName(address: string): string {
  const local = address.split('@')[0] ?? address;
  return `${local.charAt(0).toUpperCase()}${local.slice(1)} inbox`;
}

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
    <div className={styles.window} aria-busy="true" aria-label="Loading the inbox">
      <div className={styles.listPane}>
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
  const accounts = useMailAccounts().data ?? [];
  const addresses = accounts.length > 0 ? accounts.map((a) => a.address) : [INBOX_ADDRESS];
  const defaultAccount = addresses[0] ?? INBOX_ADDRESS;
  const accountParam = params.get('account');
  const account = accountParam && addresses.includes(accountParam) ? accountParam : defaultAccount;
  const view = parseInboxView(params.get('view'));
  const query = params.get('q') ?? '';
  const search = params.toString();
  // Each email belongs to the mailbox it was sent to.
  const mailbox = requests.filter((r) => r.to === account);
  const shown = mailbox.filter((r) => inView(r, view) && matchesSearch(r, query));
  const selected = requests.find((r) => r.id === selectedId) ?? (selectedId ? undefined : shown[0]);
  const processing = mailbox.filter((r) => r.status === 'reading' || r.status === 'extracting');
  const unread = mailbox.filter((r) => !r.read).length;
  const unreadIn = (address: string) => requests.filter((r) => r.to === address && !r.read).length;
  const [isAdding, setIsAdding] = useState(false);
  const markRead = useMarkInboxRead();
  // Emails the PM marked unread on purpose stay unread while they're still open.
  const [keptUnread, setKeptUnread] = useState<string[]>([]);
  const openedId =
    selectedId && selected && !selected.read && !keptUnread.includes(selected.id)
      ? selected.id
      : null;

  // An email you open is read (the first one shown by default stays unread until clicked).
  useEffect(() => {
    if (openedId) markRead.mutate({ id: openedId, read: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opened email
  }, [openedId]);

  const setParam = (key: 'view' | 'q', value: string) => {
    const next = new URLSearchParams(search);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Switching mailbox starts fresh: no open email, no filter or search carried over.
  const switchAccount = (address: string) => {
    const qs = address === defaultAccount ? '' : `?account=${encodeURIComponent(address)}`;
    router.replace(`${routes.admin.inbox}${qs}`, { scroll: false });
  };

  const hrefFor = (id: string) => `${routes.admin.inboxRequest(id)}${search ? `?${search}` : ''}`;
  const toggleRead = (request: InboxRequest) => {
    setKeptUnread((ids) =>
      request.read ? [...ids, request.id] : ids.filter((id) => id !== request.id),
    );
    markRead.mutate({ id: request.id, read: !request.read });
  };

  // A mail window: the message list and the open email, each scrolling on its own.
  return (
    <div className={`${styles.window} ${selectedId ? styles.hasSelection : ''}`}>
      <section className={styles.listPane} aria-labelledby="inbox-title">
        <header className={styles.listHeader}>
          <h1 id="inbox-title" className={styles.title}>
            Inbox
          </h1>
          {/* The mailbox being read, switchable like accounts in a mail app. */}
          <MenuButton
            kind="ghost"
            size="sm"
            label={account}
            menuAlignment="bottom-start"
            className={styles.accountButton}
          >
            <MenuItemRadioGroup
              label="Mailboxes"
              items={addresses}
              selectedItem={account}
              itemToString={(item) => {
                const address = String(item);
                const count = unreadIn(address);
                return count > 0
                  ? `${mailboxName(address)} · ${count} unread`
                  : mailboxName(address);
              }}
              onChange={(item) => switchAccount(String(item))}
            />
            <MenuItemDivider />
            <MenuItem
              label="Add another account"
              renderIcon={Add}
              onClick={() => setIsAdding(true)}
            />
          </MenuButton>
          <p className={styles.listMeta}>
            <span className={styles.liveDot} aria-hidden="true" />
            {mailbox.length} messages · {unread} unread · AI agent live,{' '}
            {processing.length === 1 ? '1 processing' : `${processing.length} processing`}
          </p>
          <div className={styles.search}>
            <Search
              key={account}
              size="md"
              labelText="Search requests"
              placeholder="Search"
              defaultValue={query}
              onChange={(event) => setParam('q', event.target.value)}
              closeButtonLabelText="Clear search"
            />
          </div>
          {/* Mail filters as chips: everything, unread only, or emails with a file. */}
          <div className={styles.chips} role="group" aria-label="Filter emails">
            {INBOX_VIEWS.map((option) => (
              <SelectableTag
                key={option}
                className={styles.chip}
                id={`inbox-filter-${option}`}
                size="md"
                // Like a mail app, only Unread carries a count.
                text={
                  option === 'unread'
                    ? `${INBOX_VIEW_LABELS[option]} ${unread}`
                    : INBOX_VIEW_LABELS[option]
                }
                selected={view === option}
                onChange={(isOn: boolean) => setParam('view', isOn ? option : 'all')}
              />
            ))}
          </div>
        </header>
        {mailbox.length === 0 ? (
          <p className={styles.noResults} role="status">
            Connected. The AI is watching {account}; new client emails will appear here.
          </p>
        ) : shown.length === 0 ? (
          <p className={styles.noResults} role="status">
            No emails match. Clear the search or choose another filter.
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
                  <span className={styles.dotCol} aria-hidden={request.read ? true : undefined}>
                    {request.read ? null : (
                      <span className={styles.unreadDot}>
                        <span className="cds--visually-hidden">Unread: </span>
                      </span>
                    )}
                  </span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowTop}>
                      <span className={request.read ? styles.sender : styles.senderUnread}>
                        {request.from.name}
                      </span>
                      <time className={styles.time} dateTime={request.receivedAt}>
                        {receivedLabel(request.receivedAt)}
                      </time>
                    </span>
                    <span className={styles.subjectLine}>
                      <span className={request.read ? styles.subject : styles.subjectUnread}>
                        {request.subject}
                      </span>
                      {request.attachment ? (
                        <Attachment aria-label="Has attachment" className={styles.clip} />
                      ) : null}
                    </span>
                    <span className={styles.preview}>{request.body}</span>
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
            onToggleRead={() => toggleRead(selected)}
          />
        ) : mailbox.length === 0 ? (
          <EmptyState
            pictogram={<EmailPictogram aria-hidden="true" />}
            title="No emails yet"
            description={`When a client emails ${account}, the AI reads it and any attachment, then drafts a project file for you here.`}
          />
        ) : (
          <EmptyState
            pictogram={<EmailPictogram aria-hidden="true" />}
            title="We couldn’t find that email"
            description="It may have been moved or deleted. Choose another email from the list."
          />
        )}
      </section>

      {isAdding ? (
        <AddAccountModal
          onClose={() => setIsAdding(false)}
          onAdded={(address) => {
            setIsAdding(false);
            switchAccount(address);
          }}
        />
      ) : null}
    </div>
  );
}

function FileIcon({ kind }: { kind: 'pdf' | 'docx' | 'xlsx' }) {
  if (kind === 'pdf') return <DocumentPdf size={24} aria-hidden={true} />;
  if (kind === 'xlsx') return <SpreadsheetIcon size={24} aria-hidden={true} />;
  return <Document size={24} aria-hidden={true} />;
}

function ReadingPane({
  request,
  backHref,
  onToggleRead,
}: {
  request: InboxRequest;
  backHref: string;
  onToggleRead: () => void;
}) {
  const done = request.steps.filter((s) => s.done).length;
  const file = request.attachment;
  const projectHref = request.projectId ? routes.admin.project(request.projectId) : null;
  const photo = senderPhoto(request.from.email);

  return (
    <article className={styles.reading} aria-labelledby="request-subject">
      {/* Phones only: back to the list. */}
      <Link href={backHref} className={styles.back}>
        <ArrowLeft aria-hidden={true} /> Inbox
      </Link>

      {/* Mail header: who it's from, the subject and addresses; actions and the date on the right. */}
      <header className={styles.mailHeader}>
        <span className={styles.avatar} aria-hidden="true">
          {photo ? (
            <Image src={photo} alt="" width={48} height={48} className={styles.avatarPhoto} />
          ) : (
            initials(request.from.name)
          )}
        </span>
        <div className={styles.mailFrom}>
          <p className={styles.fromName}>
            {request.from.name}
            <span className={styles.fromCompany}> · {request.company}</span>
          </p>
          <h2 id="request-subject" className={styles.subjectLarge}>
            {request.subject}
          </h2>
          <dl className={styles.mailMeta}>
            <div>
              <dt>From:</dt>
              <dd>{request.from.email}</dd>
            </div>
            <div>
              <dt>To:</dt>
              <dd>{request.to}</dd>
            </div>
          </dl>
        </div>
        <div className={styles.headerSide}>
          <div className={styles.headerActions}>
            <IconButton
              kind="ghost"
              size="md"
              align="bottom"
              label={request.read ? 'Mark as unread' : 'Mark as read'}
              onClick={onToggleRead}
            >
              {request.read ? <EmailNew /> : <Email />}
            </IconButton>
            {request.projectId && request.status === 'client_reply' ? (
              <Button
                as={Link}
                href={routes.admin.projectStep(request.projectId, 'pick')}
                size="md"
                renderIcon={ArrowRight}
              >
                Open {request.from.name.split(' ')[0]}’s picks
              </Button>
            ) : projectHref && request.status === 'brief_ready' ? (
              <Button as={Link} href={projectHref} size="md" renderIcon={ArrowRight}>
                Open project file
              </Button>
            ) : projectHref ? (
              <Button
                as={Link}
                href={projectHref}
                kind="tertiary"
                size="md"
                renderIcon={ArrowRight}
              >
                Open in project
              </Button>
            ) : null}
          </div>
          <time
            className={styles.mailDate}
            dateTime={request.receivedAt}
            title={fullDateLabel(request.receivedAt)}
          >
            {dateTimeLabel(request.receivedAt)}
          </time>
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

      <p className={styles.body}>{request.body}</p>

      {request.autoReply ? (
        <div className={styles.section}>
          <div className={styles.panelHeader}>
            <AIExplainLabel aria-label="Automatic reply" />
            <h3 className={styles.panelTitle}>AI replied automatically</h3>
          </div>
          <p className={styles.autoReply}>{request.autoReply}</p>
        </div>
      ) : null}

      <div className={styles.section}>
        <div className={styles.panelHeader}>
          <AIExplainLabel aria-label="What the system did" />
          <h3 className={styles.panelTitle}>What the system did</h3>
          <span className={styles.panelMeta}>
            {done} of {request.steps.length} done
          </span>
          {/* Where the AI got to with this email: the outcome of the steps below. */}
          <InboxStatusTag request={request} size="sm" />
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
              <span className={styles.stepTime}>
                {step.at ? stepTimeLabel(step.at, request.receivedAt) : 'Now'}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {file ? (
        <div className={styles.section}>
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
      embedded
    />
  );
}
