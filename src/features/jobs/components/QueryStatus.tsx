import type { ReactNode } from 'react';

import { ERROR_MESSAGES, isApiError } from '@/api/errors';
import { ErrorState } from '@/components/ui/ErrorState';

import type { QueryView } from '../hooks/queryView';

type Props = {
  view: QueryView;
  testID: string;
  error?: unknown;
  onRetry: () => void;
  retrying?: boolean;
  /** Skeleton for `loading`. */
  skeleton: ReactNode;
};

/**
 * The three non-data states of a list screen. `ready` renders nothing: the screen shows its list and its own
 * empty text. The website has no error state (a failed load looks like "no jobs"); the app uses its
 * "Something went wrong" + "Try Again" box, and a plain offline message when there is no network.
 * testIDs: `{testID}.loading` (skeleton, from the caller), `{testID}.offline`, `{testID}.error`.
 */
export function QueryStatus({ view, testID, error, onRetry, retrying, skeleton }: Props) {
  if (view === 'loading') return <>{skeleton}</>;
  if (view === 'offline') {
    return (
      <ErrorState
        testID={`${testID}.offline`}
        title="You're offline"
        message={ERROR_MESSAGES.network}
        onRetry={onRetry}
        retrying={retrying}
      />
    );
  }
  if (view === 'error') {
    return (
      <ErrorState
        testID={`${testID}.error`}
        message={isApiError(error) ? error.message : ERROR_MESSAGES.generic}
        onRetry={onRetry}
        retrying={retrying}
      />
    );
  }
  return null;
}
