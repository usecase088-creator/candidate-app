import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { initialsOf } from './LogoTile';
import { AppText, type TextVariant } from './Text';

export type AvatarSize = 40 | 56 | 88;

export type AvatarProps = {
  testID: string;
  /** Person's name: initials when there is no photo, and the spoken label. */
  name: string;
  uri?: string | null;
  size?: AvatarSize;
  /** 2-pt brand ring (e.g. the Profile header). */
  ring?: boolean;
};

const VARIANT_FOR_SIZE: Record<AvatarSize, TextVariant> = { 40: 'label', 56: 'rowTitle', 88: 'title' };

/** Circular person avatar: the photo (cached by expo-image) over brand-tinted initials that show until it loads. */
export function Avatar({ testID, name, uri, size = 56, ring = false }: AvatarProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = Boolean(uri) && uri !== failedUri;
  const trimmed = name.trim();
  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={showImage ? `${trimmed}'s photo` : `${trimmed} initials`}
      style={[styles.wrap, { width: size, height: size }]}
    >
      <AppText
        testID={`${testID}.initials`}
        variant={VARIANT_FOR_SIZE[size]}
        weight="semibold"
        color="brand"
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
      >
        {initialsOf(name)}
      </AppText>
      {showImage && uri ? (
        <Image
          testID={`${testID}.image`}
          source={{ uri }}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          accessible={false}
          onError={() => setFailedUri(uri)}
          style={[StyleSheet.absoluteFill, styles.image]}
        />
      ) : null}
      {ring ? (
        <View testID={`${testID}.ring`} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: colors.brandSoft,
  },
  image: { borderRadius: radius.full, backgroundColor: colors.surface },
  ring: { borderRadius: radius.full, borderWidth: 2, borderColor: colors.brand },
});
