import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, logoTints, radius } from '@/theme/tokens';

import { AppText } from './Text';

export type LogoTileSize = 40 | 48 | 56;

export type LogoTileProps = {
  testID: string;
  /** Hospital name: initials when there is no logo, and the spoken label. */
  name: string;
  uri?: string | null;
  size?: LogoTileSize;
};

/** First letter of the first two words, uppercased ("Seed City Multispeciality Hospital" -> "SC"). */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase();
}

/** Small, stable string hash (djb2 over code points) so the same name always gets the same tint. */
function hash(text: string): number {
  let h = 5381;
  for (const ch of text) h = (h * 33 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return h;
}

export type LogoTint = (typeof logoTints)[number];

/** Deterministic tint for an initials tile: one of the six `logoTints`. */
export function tintFor(name: string): LogoTint {
  return logoTints[hash(name) % logoTints.length] as LogoTint;
}

/** Hospital logo box: the logo (cached by expo-image) over an initials tile that shows until it loads or if it fails. */
export function LogoTile({ testID, name, uri, size = 40 }: LogoTileProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = Boolean(uri) && uri !== failedUri;
  const tint = tintFor(name);
  const box = { width: size, height: size, borderRadius: size >= 48 ? radius.md : radius.sm };
  const trimmed = name.trim();
  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={trimmed ? `${trimmed} logo` : 'Hospital logo'}
      style={[styles.tile, box, { backgroundColor: tint.bg }]}
    >
      <AppText
        testID={`${testID}.initials`}
        variant={size >= 48 ? 'rowTitle' : 'label'}
        weight="semibold"
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={{ color: tint.fg }}
      >
        {initialsOf(name)}
      </AppText>
      {showImage && uri ? (
        <>
          <Image
            testID={`${testID}.image`}
            source={{ uri }}
            contentFit="contain"
            transition={150}
            cachePolicy="memory-disk"
            accessible={false}
            onError={() => setFailedUri(uri)}
            style={[StyleSheet.absoluteFill, styles.image, { borderRadius: box.borderRadius }]}
          />
          <View
            testID={`${testID}.ring`}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.ring, { borderRadius: box.borderRadius }]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { backgroundColor: colors.surface },
  ring: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.separator },
});
