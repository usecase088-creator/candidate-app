import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { api } from '@/api/client';
import { AppConfigSchema } from '@/api/schemas/appConfig';
import { isOlderThan } from '@/lib/version';

export const APP_CONFIG_KEY = ['app-config'] as const;

/**
 * The server's settings for the app. A failed or strange answer is simply "no settings": the app must never stop
 * working because this one call did (fail open).
 */
export const useAppConfig = () =>
  useQuery({
    queryKey: APP_CONFIG_KEY,
    queryFn: () => api.get('/api/app-config', AppConfigSchema),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

/** A feature flag. `fallback` is what the app does until the server has answered, and when it never does. */
export function useFlag(name: string, fallback: boolean): boolean {
  return useAppConfig().data?.flags[name] ?? fallback;
}

/** True when the server says this installed version is too old. */
export function useUpdateRequired(): boolean {
  const config = useAppConfig().data;
  if (!config) return false;
  const minimum = Platform.OS === 'ios' ? config.minVersion.ios : config.minVersion.android;
  return isOlderThan(Constants.expoConfig?.version ?? '', minimum);
}
