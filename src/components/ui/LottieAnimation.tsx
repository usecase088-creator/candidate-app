import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';

// D19: the website's own animation files (../job/candidates/public/), copied to assets/lottie/.
const SOURCES = {
  authSuccess: require('../../../assets/lottie/successful_signup_signin.json'),
  mailSent: require('../../../assets/lottie/mail_sent.json'),
  resetDone: require('../../../assets/lottie/rest_sent_flow.json'),
};

export type LottieName = keyof typeof SOURCES;

export type LottieAnimationProps = {
  testID: string;
  name: LottieName;
  size: number;
  loop?: boolean;
};

/** Decorative: hidden from screen readers. With Reduce Motion it doesn't play, like the website. */
export function LottieAnimation({ testID, name, size, loop = false }: LottieAnimationProps) {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => active && setReduceMotion(v));
    return () => {
      active = false;
    };
  }, []);

  return (
    <View
      testID={testID}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, alignSelf: 'center' }}
    >
      {reduceMotion !== null && (
        <LottieView
          testID={`${testID}.lottie`}
          source={SOURCES[name]}
          autoPlay={!reduceMotion}
          loop={loop && !reduceMotion}
          style={{ width: size, height: size }}
        />
      )}
    </View>
  );
}
