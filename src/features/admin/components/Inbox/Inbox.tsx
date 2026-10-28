'use client';

import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  IconButton,
  InlineNotification,
  Search,
  MenuButton,
  Modal,
  MenuItem,
  MenuItemDivider,
  MenuItemRadioGroup,
  SelectableTag,
  SkeletonText,
} from '@carbon/react';
import {
  Add,
  ArrowLeft,
  Attachment,
  Email,
  EmailNew,
  Folder,
  Locked,
  CheckmarkFilled,
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
import type { SourcePage } from '../../model/project.schema';
import {
  fullDateLabel,
  InboxStatusTag,
  longDateLabel,
  initials,
  receivedLabel,
  senderPhoto,
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
  const file = request.attachment;
  const projectHref = request.projectId ? routes.admin.project(request.projectId) : null;
  const photo = senderPhoto(request.from.email);
  const domain = request.from.email.split('@')[1] ?? request.from.email;
  const first = request.from.name.split(' ')[0] ?? request.from.name;
  const hasAiNotes =
    (request.confirmations.length > 0 && request.status === 'brief_ready') ||
    (request.status === 'cant_open' && file !== null) ||
    request.autoReply !== null;

  return (
    <article className={styles.reading} aria-labelledby="request-subject">
      {/* Phones only: back to the list. */}
      <Link href={backHref} className={styles.back}>
        <ArrowLeft aria-hidden={true} /> Inbox
      </Link>

      {/* Mail header, as in Apple Mail: who sent it and to whom on the left; the mailbox, the
          date and what to do with it on the right. */}
      <header className={styles.mailHeader}>
        <span className={styles.avatar} aria-hidden="true">
          {photo ? (
            <Image src={photo} alt="" width={48} height={48} className={styles.avatarPhoto} />
          ) : (
            initials(request.from.name)
          )}
        </span>
        <div className={styles.mailFrom}>
          <p className={styles.fromName}>{request.from.name}</p>
          <p className={styles.fromDomain} title={`Sender matched to client “${request.company}”`}>
            <CheckmarkFilled aria-hidden={true} className={styles.verified} />
            {domain} · {request.company}
          </p>
        </div>
        <div className={styles.mailSubject}>
          <h2 id="request-subject" className={styles.subjectLarge}>
            {request.subject}
          </h2>
          <p className={styles.mailTo}>
            <span className={styles.mailToLabel}>To:</span> {request.to}
          </p>
        </div>
        <div className={styles.headerSide}>
          <p className={styles.mailWhere}>
            <span className={styles.mailbox}>
              <Folder aria-hidden={true} /> Inbox · {mailboxName(request.to).replace(' inbox', '')}
            </span>
            <time dateTime={request.receivedAt} title={fullDateLabel(request.receivedAt)}>
              {longDateLabel(request.receivedAt)}
            </time>
          </p>
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
              >
                Open {first}’s picks
              </Button>
            ) : projectHref && request.status === 'brief_ready' ? (
              <Button as={Link} href={projectHref} size="md">
                Open project file
              </Button>
            ) : projectHref ? (
              <Button as={Link} href={projectHref} kind="tertiary" size="md">
                Open in project
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* The email itself, on its own white page: the message, the sender's signature, and
          the attachment (as in Gmail). */}
      <div className={styles.paper}>
        <p className={styles.body}>{request.body}</p>

        <div className={styles.signature}>
          <span className={styles.signatureMark} aria-hidden="true">
            {initials(request.company)}
          </span>
          <div className={styles.signatureText}>
            <p className={styles.signatureName}>{request.from.name}</p>
            <p className={styles.signatureCompany}>{request.company}</p>
            <p className={styles.signatureMeta}>{request.from.email}</p>
          </div>
        </div>

        {file ? <Attachments request={request} file={file} /> : null}
      </div>

      {/* The AI's notes on this email (what needs confirming, its automatic reply), kept apart
          from the email and shown only when there are any. */}
      {hasAiNotes ? (
        <section className={styles.aiWork} aria-label="Notes from the AI">
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
              subtitle={`${file.name} is password-protected. We never try to open protected files. Ask ${first} for an unlocked copy.`}
            />
          ) : null}

          {request.autoReply ? (
            <div className={styles.section}>
              <div className={styles.panelHeader}>
                <AIExplainLabel aria-label="Automatic reply" />
                <h3 className={styles.panelTitle}>AI replied automatically</h3>
              </div>
              <p className={styles.autoReply}>{request.autoReply}</p>
            </div>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}

type Attachment = NonNullable<InboxRequest['attachment']>;

const KIND_CLASS: Record<Attachment['kind'], string | undefined> = {
  pdf: styles.kindPdf,
  docx: styles.kindDocx,
  xlsx: styles.kindXlsx,
};

const FILE_KIND_LABELS: Record<Attachment['kind'], string> = {
  pdf: 'PDF',
  docx: 'Word',
  xlsx: 'Excel',
};

/** Gmail-style attachments: a dotted rule, a count, then a card per file with a page preview. */
function Attachments({ request, file }: { request: InboxRequest; file: Attachment }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // The page preview comes from the project the AI drafted from this file, when there is one.
  const project = useProject(request.projectId ?? '', { enabled: Boolean(request.projectId) });
  // The first page with some substance, so the thumbnail reads as a page of text.
  const pages = request.projectId ? (project.data?.document.pages ?? []) : [];
  const firstPage = pages.find((p) => p.blocks.length >= 4) ?? pages[0];
  const isLocked = request.status === 'cant_open';
  const isReading = file.progress != null;
  const canPreview = Boolean(firstPage) && file.kind === 'pdf' && !isLocked && !isReading;
  const meta = [file.size, file.pages ? `${file.pages} pages` : null, file.note]
    .filter(Boolean)
    .join(' · ');

  const card = (
    <>
      <span className={styles.thumb} aria-hidden="true">
        {canPreview && firstPage ? (
          <span className={styles.page}>
            {firstPage.blocks.slice(0, 9).map((block) =>
              block.kind === 'heading' ? (
                <span key={block.id} className={styles.pageHeading} />
              ) : (
                // One thin line per ~60 characters of text, like a page seen from afar.
                Array.from({ length: Math.min(3, Math.ceil(block.text.length / 60)) }, (_, i) => (
                  <span key={`${block.id}-${i}`} className={styles.pageLine} />
                ))
              ),
            )}
          </span>
        ) : (
          <span className={styles.thumbIcon}>
            {isLocked ? <Locked size={32} /> : <FileIcon kind={file.kind} />}
            <span className={styles.thumbNote}>
              {isLocked
                ? 'Password-protected'
                : isReading
                  ? `${request.status === 'extracting' ? 'Extracting text' : 'Reading'} · ${file.progress}%`
                  : 'No preview'}
            </span>
            {isReading ? (
              <span className={styles.thumbProgress}>
                <span style={{ inlineSize: `${file.progress ?? 0}%` }} />
              </span>
            ) : null}
          </span>
        )}
      </span>
      <span className={styles.cardFooter}>
        <span className={`${styles.kindBadge} ${KIND_CLASS[file.kind]}`}>
          {FILE_KIND_LABELS[file.kind]}
        </span>
        <span className={styles.cardName}>{file.name}</span>
      </span>
    </>
  );

  return (
    <section className={styles.attachments} aria-labelledby="attachments-title">
      <div className={styles.attachmentsHeader}>
        <h3 id="attachments-title" className={styles.attachmentsTitle}>
          One attachment
        </h3>
        <span className={styles.attachmentsMeta}>
          <AIExplainLabel size="xs" aria-label="Attachment read by AI" />
          {isLocked ? 'Not opened by AI' : isReading ? 'AI is reading it' : 'Read by AI'}
        </span>
      </div>
      <div className={styles.cards}>
        {canPreview ? (
          <button
            type="button"
            className={styles.card}
            aria-label={`Preview ${file.name}, ${meta}`}
            onClick={() => setIsPreviewOpen(true)}
          >
            {card}
          </button>
        ) : (
          <div className={styles.card} aria-label={`${file.name}, ${meta}`} role="group">
            {card}
          </div>
        )}
        <p className={styles.cardMeta}>{meta}</p>
      </div>
      {isPreviewOpen && project.data
        ? createPortal(
            <AttachmentPreview
              fileName={file.name}
              document={project.data.document}
              onClose={() => setIsPreviewOpen(false)}
            />,
            document.body,
          )
        : null}
    </section>
  );
}

function AttachmentPreview({
  fileName,
  document,
  onClose,
}: {
  fileName: string;
  document: { pages: SourcePage[]; pageCount: number };
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  return (
    <Modal
      open
      passiveModal
      size="lg"
      modalLabel="Attachment"
      modalHeading={fileName}
      onRequestClose={onClose}
    >
      <SourceDocument
        title="Preview"
        fileName={fileName}
        pages={document.pages}
        pageCount={document.pageCount}
        page={page}
        onPageChange={setPage}
        embedded
      />
    </Modal>
  );
}
