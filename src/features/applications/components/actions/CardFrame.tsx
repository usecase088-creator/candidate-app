// The tinted panel every action card sits in (website: CandidateActionCard.tsx). D32: a `Panel` with a semantic
// tone (warning = needs you, info = waiting, success = done) and an icon; the body text stays near-black.
import type { SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';

import { Panel, type PanelTone } from '@/components/ui/Panel';

export type CardFrameProps = {
  tone: PanelTone;
  icon: SymbolViewProps['name'];
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function CardFrame({ tone, icon, title, children, actions }: CardFrameProps) {
  return (
    <Panel testID="action.card" tone={tone} icon={icon} title={title} actions={actions}>
      {children}
    </Panel>
  );
}
