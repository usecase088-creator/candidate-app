import { useEffect, useState } from 'react';

import { secureStorage } from '@/lib/secureStorage';

import { LAST_STEP } from './options';

/** The step the user reached, so the builder can pick up where they stopped. A number, not personal data. */
export const BUILDER_STEP_KEY = 'profile.builder.step';

const clamp = (n: number) => (Number.isInteger(n) ? Math.min(Math.max(n, 0), LAST_STEP) : 0);

/** The saved step, or undefined while it is still being read. */
export function useSavedStep(): number | undefined {
  const [step, setStep] = useState<number>();
  useEffect(() => {
    let live = true;
    secureStorage
      .getItem(BUILDER_STEP_KEY)
      .then((v) => live && setStep(clamp(Number(v ?? 0))))
      .catch(() => live && setStep(0));
    return () => {
      live = false;
    };
  }, []);
  return step;
}

export const saveStep = (step: number) => secureStorage.setItem(BUILDER_STEP_KEY, String(step));
export const clearSavedStep = () => secureStorage.deleteItem(BUILDER_STEP_KEY);
