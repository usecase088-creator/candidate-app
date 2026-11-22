import { ScrollView, View } from 'react-native';

import { fireEvent, render, screen } from '@/test/render';

import { FIELD_SCROLL_GAP, useFieldScroll } from '../useFieldScroll';

const layout = (y: number) => ({ nativeEvent: { layout: { x: 0, y, width: 300, height: 40 } } });

function Form({ target }: { target: string[] }) {
  const { scrollRef, onLayoutOf, scrollToField } = useFieldScroll();
  return (
    <ScrollView ref={scrollRef} testID="scroll">
      <View testID="group" onLayout={onLayoutOf('group')}>
        <View testID="field" onLayout={onLayoutOf('field')} />
      </View>
      <View testID="go" onTouchEnd={() => scrollToField(target)} />
    </ScrollView>
  );
}

// R3 #1: an invalid submit from the sticky bar must bring the field with the error into view.
describe('useFieldScroll', () => {
  const scrollTo = jest.mocked(ScrollView.prototype.scrollTo);
  beforeEach(() => scrollTo.mockClear());

  it('scrolls to the sum of the nested layout offsets, a little above the field', async () => {
    await render(<Form target={['group', 'field']} />);
    await fireEvent(screen.getByTestId('group'), 'layout', layout(400));
    await fireEvent(screen.getByTestId('field'), 'layout', layout(120));
    await fireEvent(screen.getByTestId('go'), 'touchEnd');
    expect(scrollTo).toHaveBeenCalledWith({ y: 400 + 120 - FIELD_SCROLL_GAP, animated: true });
  });

  it('never scrolls above the top', async () => {
    await render(<Form target={['field']} />);
    await fireEvent(screen.getByTestId('field'), 'layout', layout(4));
    await fireEvent(screen.getByTestId('go'), 'touchEnd');
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('does nothing for a field that has not been laid out', async () => {
    await render(<Form target={['group', 'missing']} />);
    await fireEvent(screen.getByTestId('go'), 'touchEnd');
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
