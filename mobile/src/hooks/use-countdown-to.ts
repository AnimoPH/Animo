import { useEffect, useState } from 'react';

/**
 * Ticking seconds-remaining until a server-set deadline (e.g.
 * `purchaserequest.cancel_deadline`). Never derive a countdown from a
 * hardcoded window — always from the real deadline the server returned, so
 * client/server clock drift can only ever make the client early, never late
 * relative to the RPC's own `now() >= cancel_deadline` check.
 */
export function useCountdownTo(deadline: string | null | undefined): number {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(deadline));

  useEffect(() => {
    setSecondsLeft(secondsUntil(deadline));
    if (!deadline) return;

    const id = setInterval(() => {
      setSecondsLeft(secondsUntil(deadline));
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return secondsLeft;
}

function secondsUntil(deadline: string | null | undefined): number {
  if (!deadline) return 0;
  return Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
}
