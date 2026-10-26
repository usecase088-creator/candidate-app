import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';

import { useToast } from '@/components/ui/Toast';

import { isOpenableLink } from '../../logic/deadline';

/**
 * Opens a gov or international listing's outside link in the in-app browser (PLAN.md Phase 2). The links are typed
 * by an admin, so anything that is not http(s) is refused instead of being handed to the system.
 */
export function useOpenLink() {
  const toast = useToast();
  return useCallback(
    (url: string) => {
      if (!isOpenableLink(url)) {
        toast.show("This link can't be opened.", { variant: 'error' });
        return;
      }
      void WebBrowser.openBrowserAsync(url).catch(() =>
        toast.show("This link can't be opened.", { variant: 'error' }),
      );
    },
    [toast],
  );
}
