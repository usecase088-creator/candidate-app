import { AccessibilityInfo } from 'react-native';

import { renderHook } from '@/test/render';

import { useAnnounce } from '../useAnnounce';

describe('useAnnounce', () => {
  it('speaks a new message once, nothing for empty values', async () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    spy.mockClear();
    const { rerender } = await renderHook(({ m }: { m: string | undefined }) => useAnnounce(m), {
      initialProps: { m: undefined as string | undefined },
    });
    expect(spy).not.toHaveBeenCalled();
    await rerender({ m: 'Upload failed' });
    await rerender({ m: 'Upload failed' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Upload failed');
    await rerender({ m: '' });
    await rerender({ m: 'Another' });
    expect(spy).toHaveBeenLastCalledWith('Another');
  });
});
