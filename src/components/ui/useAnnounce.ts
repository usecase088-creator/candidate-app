import { useEffect } from 'react';

import { announce } from '@/lib/announce';

/**
 * Speaks `message` whenever it changes to a new non-empty value (R3 a11y P1-1): errors and status lines that mount a
 * new View are not announced by role="alert" on iOS, and often not by an Android live region.
 */
export function useAnnounce(message: string | undefined | null | false): void {
  useEffect(() => {
    if (message) announce(message);
  }, [message]);
}
