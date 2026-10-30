/**
 * Push notifications for the mobile app, through Expo's push service (which delivers to Android FCM and iPhone APNs).
 *
 * - The app registers its Expo push token (routes/pushTokenRoutes.ts).
 * - Whenever an InAppNotification row is created (lib/prisma.ts), the same text is pushed to that user's phones.
 * - A push problem NEVER fails the request that created the notification: everything here is caught and only logged.
 * - Switched off unless EXPO_PUSH_ENABLED=true, so the code can be deployed before the two tables exist.
 * - Dead phones (DeviceNotRegistered) are forgotten at once, or when Expo's receipt arrives (processReceipts, cron).
 */
import prisma from './prisma';
import logger from './logger';

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const BATCH = 100; // Expo accepts up to 100 messages per request
const RECEIPT_AFTER_MS = 15 * 60 * 1000; // Expo asks to wait at least 15 minutes
const RECEIPT_KEEP_MS = 24 * 60 * 60 * 1000; // Expo keeps receipts 24 hours

const TOKEN = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{1,200}\]$/;

export const isExpoPushToken = (value: unknown): value is string => typeof value === 'string' && TOKEN.test(value);

const enabled = () => process.env.EXPO_PUSH_ENABLED === 'true';

export type PushMessage = { title: string; body: string; data: Record<string, string> };

/** What the phone shows for a notification row. Text is cut to what a lock screen can use. */
export function pushPayloadFor(n: { id?: string; title: string; message: string; link?: string | null }): PushMessage {
  const data: Record<string, string> = {};
  if (n.link) data.link = n.link;
  if (n.id) data.notificationId = n.id;
  return { title: n.title.slice(0, 100), body: n.message.slice(0, 300), data };
}

type Ticket = { status?: string; id?: string; details?: { error?: string } };

async function post(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Expo push service answered ${res.status}`);
  return res.json();
}

const forget = (tokens: string[]) =>
  tokens.length > 0 ? prisma.pushToken.deleteMany({ where: { token: { in: tokens } } }) : Promise.resolve();

export async function sendPushToUser(userId: string, message: PushMessage): Promise<void> {
  if (!enabled()) return;
  try {
    const rows = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    const tokens = rows.map((r) => r.token).filter(isExpoPushToken);
    for (let i = 0; i < tokens.length; i += BATCH) {
      const chunk = tokens.slice(i, i + BATCH);
      const json = (await post(
        SEND_URL,
        chunk.map((to) => ({ to, ...message, sound: 'default', channelId: 'default' })),
      )) as { data?: Ticket[] };
      const tickets = Array.isArray(json?.data) ? json.data : [];
      const dead: string[] = [];
      const pending: { ticketId: string; token: string }[] = [];
      tickets.forEach((t, n) => {
        const token = chunk[n];
        if (!token) return;
        if (t.status === 'ok' && t.id) pending.push({ ticketId: t.id, token });
        else if (t.details?.error === 'DeviceNotRegistered') dead.push(token);
      });
      await forget(dead);
      if (pending.length > 0) await prisma.pushReceiptPending.createMany({ data: pending });
    }
  } catch (error) {
    logger.warn('Push send failed (ignored): %s', error instanceof Error ? error.message : String(error));
  }
}

/** Cron: ask Expo what happened to tickets older than 15 minutes; forget phones that are gone. */
export async function processReceipts(now: Date = new Date()): Promise<void> {
  if (!enabled()) return;
  try {
    // Expo only keeps receipts for a day: older tickets can never be answered.
    await prisma.pushReceiptPending.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - RECEIPT_KEEP_MS) } },
    });
    const due = await prisma.pushReceiptPending.findMany({
      where: { createdAt: { lt: new Date(now.getTime() - RECEIPT_AFTER_MS) } },
      take: 1000,
    });
    for (let i = 0; i < due.length; i += 300) {
      const chunk = due.slice(i, i + 300);
      const json = (await post(RECEIPTS_URL, { ids: chunk.map((c) => c.ticketId) })) as {
        data?: Record<string, Ticket>;
      };
      const receipts = json?.data && typeof json.data === 'object' ? json.data : {};
      const dead = chunk
        .filter((c) => receipts[c.ticketId]?.details?.error === 'DeviceNotRegistered')
        .map((c) => c.token);
      await forget(dead);
      await prisma.pushReceiptPending.deleteMany({ where: { id: { in: chunk.map((c) => c.id) } } });
    }
  } catch (error) {
    logger.warn('Push receipt check failed (ignored): %s', error instanceof Error ? error.message : String(error));
  }
}
