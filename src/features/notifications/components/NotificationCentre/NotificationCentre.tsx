'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  HeaderGlobalAction,
  HeaderPanel,
  SkeletonText,
  ToastNotification,
} from '@carbon/react';
import { Notification as NotificationIcon, NotificationNew } from '@carbon/icons-react';
import { Notifications as NotificationsPictogram } from '@carbon/pictograms-react';
import { toUserMessage } from '@/shared/api';
import { formatDateTime, formatRelative } from '@/shared/lib/dates';
import { EmptyState, ErrorState } from '@/shared/ui';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../../api/queries';
import type { Notification } from '../../model/notification.schema';
import styles from './NotificationCentre.module.scss';

type NotificationCentreProps = {
  /** Where "Notification settings" goes for this role; omitted when there is none. */
  settingsHref?: string;
};

/** F17 notification centre: header bell with unread count → Carbon HeaderPanel + toasts. */
export function NotificationCentre({ settingsHref }: NotificationCentreProps) {
  const notifications = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const [isOpen, setIsOpen] = useState(false);
  const toast = useNewArrivalToast(notifications.data);
  const unread = notifications.data?.filter((n) => !n.read).length ?? 0;
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';

  return (
    <>
      <HeaderGlobalAction
        aria-label={label}
        aria-expanded={isOpen}
        isActive={isOpen}
        tooltipAlignment="end"
        className={styles.trigger}
        onClick={() => setIsOpen((open) => !open)}
      >
        {unread > 0 ? <NotificationNew size={20} /> : <NotificationIcon size={20} />}
        {unread > 0 ? (
          <span className={styles.badge} aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </HeaderGlobalAction>
      {/* Labelled by the section inside: an aria-label on this role-less div is invalid. */}
      <HeaderPanel
        expanded={isOpen}
        className={isOpen ? styles.panelOpen : undefined}
        onHeaderPanelFocus={() => setIsOpen(false)}
      >
        {isOpen ? (
          <section className={styles.content} aria-labelledby="notifications-title">
            <div className={styles.header}>
              <h2 id="notifications-title" className={styles.title}>
                Notifications
              </h2>
              <Button
                kind="ghost"
                size="sm"
                disabled={unread === 0 || markAll.isPending}
                onClick={() => markAll.mutate()}
              >
                Mark all as read
              </Button>
            </div>
            {markAll.isError ? (
              <p className={styles.inlineError} role="alert">
                {toUserMessage(markAll.error)}
              </p>
            ) : null}
            {notifications.data === undefined && notifications.isPending ? (
              <div className={styles.body} aria-busy="true" aria-label="Loading notifications">
                <SkeletonText paragraph lineCount={6} />
              </div>
            ) : notifications.data === undefined ? (
              <div className={styles.body}>
                <ErrorState
                  title="Notifications didn’t load"
                  message={toUserMessage(notifications.error)}
                  onRetry={() => void notifications.refetch()}
                />
              </div>
            ) : notifications.data.length === 0 ? (
              <div className={styles.body}>
                <EmptyState
                  headingLevel={3}
                  pictogram={<NotificationsPictogram aria-hidden="true" />}
                  title="You’re all caught up"
                  description="We’ll let you know here when something needs your attention."
                />
              </div>
            ) : (
              <ul className={styles.list} aria-labelledby="notifications-title">
                {notifications.data.map((n) => (
                  <NotificationItem key={n.id} notification={n} onOpen={() => setIsOpen(false)} />
                ))}
              </ul>
            )}
            {settingsHref ? (
              <div className={styles.footer}>
                <Link href={settingsHref} onClick={() => setIsOpen(false)}>
                  Notification settings
                </Link>
              </div>
            ) : null}
          </section>
        ) : null}
      </HeaderPanel>
      {toast ? (
        <div className={styles.toasts}>
          <ToastNotification
            kind="info"
            role="status"
            title={toast.title}
            subtitle={toast.body}
            caption={formatRelative(toast.createdAt)}
            timeout={8000}
            lowContrast
            onClose={() => {
              toast.dismiss();
              return false;
            }}
          />
        </div>
      ) : null}
    </>
  );
}

function NotificationItem({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: () => void;
}) {
  const router = useRouter();
  const markRead = useMarkNotificationRead(notification.id);
  const open = () => {
    if (!notification.read) markRead.mutate();
    onOpen();
    if (notification.href) router.push(notification.href);
  };
  return (
    <li className={notification.read ? styles.item : `${styles.item} ${styles.unread}`}>
      <button type="button" className={styles.itemButton} onClick={open}>
        <span className={styles.itemTitle}>
          {notification.read ? null : <span className={styles.dot} aria-hidden="true" />}
          {notification.title}
          {notification.read ? null : <span className={styles.visuallyHidden}> (unread)</span>}
        </span>
        <span className={styles.itemBody}>{notification.body}</span>
        <time
          className={styles.itemTime}
          dateTime={notification.createdAt}
          title={formatDateTime(notification.createdAt)}
        >
          {formatRelative(notification.createdAt)}
        </time>
      </button>
    </li>
  );
}

/** Shows a toast for the newest unread notification that arrived after the first load. */
function useNewArrivalToast(list: Notification[] | undefined) {
  const seen = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<Notification | null>(null);

  useEffect(() => {
    if (!list) return;
    if (seen.current === null) {
      seen.current = new Set(list.map((n) => n.id));
      return;
    }
    const fresh = list.filter((n) => !n.read && !seen.current?.has(n.id));
    list.forEach((n) => seen.current?.add(n.id));
    // Showing a toast for data that just arrived is the intent of this effect.
    if (fresh[0]) setToast(fresh[0]);
  }, [list]);

  return toast ? { ...toast, dismiss: () => setToast(null) } : null;
}
