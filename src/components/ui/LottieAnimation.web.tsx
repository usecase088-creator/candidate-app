// Web is only used for Playwright checks in development. lottie-react-native's web player needs an extra package
// (@lottiefiles/dotlottie-react) we don't ship, so on web the animation keeps its space and plays nothing.
import { View } from 'react-native';

import type { LottieAnimationProps } from './LottieAnimation';

export function LottieAnimation({ testID, size }: LottieAnimationProps) {
  return (
    <View
      testID={testID}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, alignSelf: 'center' }}
    />
  );
}
