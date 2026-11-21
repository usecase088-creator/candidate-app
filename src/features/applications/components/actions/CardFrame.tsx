// The tinted panel every action card sits in (website: CandidateActionCard.tsx). D32: a `Panel` whose tone is the
// status pill's tone (statusTone: amber = needs you, blue = waiting, green = done), so pill, panel and the list card's
// action row never disagree; the body text stays near-black.
import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';

import { Panel } from '@/components/ui/Panel';

import { statusTone } from '../../logic/status';

export type CardFrameProps = {
  /** The application status; it picks the panel colour. */
  status: string;
  icon: SymbolViewProps['name'];
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function CardFrame({ status, icon, title, children, actions }: CardFrameProps) {
  return (
    <Panel testID="action.card" tone={statusTone(status)} icon={icon} title={title} actions={actions}>
      {children}
    </Panel>
  );
}
