// Jest stand-in for the native Lottie view: a plain View that exposes the props tests care about.
import { View, type ViewProps } from 'react-native';

type Props = ViewProps & { source?: unknown; autoPlay?: boolean; loop?: boolean };

export default function LottieView({ testID, autoPlay, loop, style, ...rest }: Props) {
  return <View testID={testID} style={style} {...rest} {...{ autoPlay, loop }} />;
}
