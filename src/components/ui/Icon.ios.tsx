// iPhone: SymbolView draws a real SF Symbol, which does not grow with the font size.
import { type SymbolViewProps, SymbolView } from 'expo-symbols';

export function Icon(props: SymbolViewProps) {
  return <SymbolView {...props} />;
}
