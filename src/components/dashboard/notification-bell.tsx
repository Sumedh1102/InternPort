"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { Bell, CheckCheck } from "lucide-react";

import type { AppNotification } from "@/lib/domain/types";
import { firebaseClient, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { cn, relativeTime } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions/account";

/**
 * In-app notifications. Server-rendered initial list; when the browser holds a Firebase
 * session for the same user it subscribes in realtime (rules allow reading your own).
 */
export function NotificationBell({
  uid,
  initial,
  href,
}: {
  uid: string;
  initial: AppNotification[];
  href?: string;
}) {
  const [items, setItems] = React.useState(initial);
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const unread = items.filter((n) => !n.read).length;

  const [prevInitial, setPrevInitial] = React.useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems(initial);
  }

  React.useEffect(() => {
    if (!isFirebaseClientConfigured()) return;
    const { auth, db } = firebaseClient();
    let unsubscribeSnapshot: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeSnapshot?.();
      unsubscribeSnapshot = undefined;
      if (!user || user.uid !== uid) return;
      const q = query(
        collection(db, "notifications"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(20),
      );
      unsubscribeSnapshot = onSnapshot(
        q,
        (snap) =>
          setItems(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                uid: data.uid,
                type: data.type,
                title: data.title,
                body: data.body,
                link: data.link ?? undefined,
                read: Boolean(data.read),
                createdAt: data.createdAt?.toDate?.().toISOString(),
              } as AppNotification;
            }),
          ),
        () => {
          // Missing index / permissions: keep the server-rendered list.
        },
      );
    });
    return () => {
      unsubscribeSnapshot?.();
      unsubscribeAuth();
    };
  }, [uid]);

  async function markRead(n: AppNotification) {
    if (n.read) return;
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try {
      await updateDoc(doc(firebaseClient().db, "notifications", n.id), { read: true });
    } catch {
      await markNotificationRead(n.id);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="relative grid size-10 place-items-center rounded-full border-2 border-ink bg-paper shadow-brutal-xs transition hover:bg-cream-2"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full border-2 border-ink bg-pink px-1 font-mono text-[0.65rem] font-bold leading-4">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 flex max-h-[70dvh] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-brutal data-[state=open]:animate-pop"
        >
          <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3">
            <p className="font-display text-lg font-extrabold">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={async () => {
                  setItems((list) => list.map((x) => ({ ...x, read: true })));
                  await markAllNotificationsRead();
                  router.refresh();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold underline"
              >
                <CheckCheck className="size-3.5" aria-hidden /> Mark all read
              </button>
            )}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up ✨</li>}
            {items.slice(0, 12).map((n) => {
              const body = (
                <>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-pink")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    <span className="line-clamp-2 block text-xs text-muted">{n.body}</span>
                    <span className="mt-0.5 block font-mono text-[0.65rem] text-muted">{relativeTime(n.createdAt)}</span>
                  </span>
                </>
              );
              const cls = cn(
                "flex w-full gap-3 border-b border-ink/10 px-4 py-3 text-left transition hover:bg-lime-soft",
                !n.read && "bg-cream",
              );
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link
                      href={n.link}
                      className={cls}
                      onClick={() => {
                        void markRead(n);
                        setOpen(false);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button type="button" className={cls} onClick={() => void markRead(n)}>
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {href && (
            <Link href={href} onClick={() => setOpen(false)} className="border-t-2 border-ink px-4 py-2.5 text-center text-sm font-semibold hover:bg-lime-soft">
              View all
            </Link>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
