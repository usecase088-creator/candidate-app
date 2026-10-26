import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

/** Hospital logo (cached by expo-image) or the website's building icon when there is none. Decorative. */
export function HospitalLogo({ uri, size = 44 }: { uri?: string | null; size?: number }) {
  const box = { width: size, height: size, borderRadius: radius.lg };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        contentFit="contain"
        cachePolicy="memory-disk"
        accessible={false}
        style={[styles.logo, box]}
        transition={150}
      />
    );
  }
  return (
    <View style={[styles.fallback, box]} accessible={false}>
      <SymbolView
        name={{ ios: 'building.2', android: 'business', web: 'business' }}
        tintColor={colors.primary}
        size={size * 0.45}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
