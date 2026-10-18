// Opens the notification inbox after a tap, but never before the splash is done.
// A tap on a cold start arrives while the splash is still showing, and opening
// the inbox then made the splash replace it with the home screen a moment later.

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
