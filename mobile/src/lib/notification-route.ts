// Opens the notification inbox after a tap, but never before the splash is done.
// A tap on a cold start arrives while the splash is still showing, and opening
// the inbox then made the splash replace it with the home screen a moment later.

/**
 * Android builds a "tap" out of any launch intent that carries extras, and some
 * launchers add extras to a normal open. Those fake taps have no message id, a
 * real push tap always does.
 */
export function isRealTap(identifier: string | null | undefined): boolean {
  return typeof identifier === 'string' && identifier.length > 0;
}

let splashDone = false;
let waiting: (() => void) | null = null;
const handled = new Set<string>();

/** Open the inbox now, or once the splash has finished. A tap seen twice opens it once. */
export function requestInbox(tapId: string, open: () => void): void {
  if (handled.has(tapId)) return;
  handled.add(tapId);
  if (splashDone) {
    open();
  } else {
    waiting = open;
  }
}

/** The splash calls this right after it moves on to the first screen. */
export function splashFinished(): void {
  splashDone = true;
  const open = waiting;
  waiting = null;
  open?.();
}

/** For tests only. */
export function resetNotificationRoute(): void {
  splashDone = false;
  waiting = null;
  handled.clear();
}
