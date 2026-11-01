// Android: expo-symbols draws the icon as text in a `size` x `size` box, and that text grows with the phone's font size,
// so at a large font the icon was clipped. The glyph gets size / fontScale (Android scales it back to `size`) and the
// box stays `size`, so an icon is always the size the design asks for.
import { type SymbolViewProps, SymbolView } from 'expo-symbols';
import { useWindowDimensions } from 'react-native';

export function Icon({ size = 24, style, ...props }: SymbolViewProps) {
  const { fontScale } = useWindowDimensions();
  return <SymbolView {...props} size={size / (fontScale || 1)} style={[{ width: size, height: size }, style]} />;
}
