import { onlineManager } from '@tanstack/react-query';
import { act } from 'react';

import { renderWithProviders, screen } from '@/test/render';

import { OFFLINE_MESSAGE, OfflineBanner } from '../OfflineBanner';

afterEach(() => onlineManager.setOnline(true));

it('shows nothing while online', async () => {
  onlineManager.setOnline(true);
  await renderWithProviders(<OfflineBanner />);
  expect(screen.queryByTestId('offline.banner')).toBeNull();
});

it('appears when the connection drops and goes away when it returns', async () => {
  await renderWithProviders(<OfflineBanner />);
  await act(async () => onlineManager.setOnline(false));
  expect(screen.getByTestId('offline.banner')).toHaveTextContent(OFFLINE_MESSAGE);
  expect(screen.getByRole('alert')).toBeOnTheScreen();
  await act(async () => onlineManager.setOnline(true));
  expect(screen.queryByTestId('offline.banner')).toBeNull();
});
