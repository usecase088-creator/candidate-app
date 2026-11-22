import type { PressableProps } from 'react-native';

import { motion } from '@/theme/tokens';

/** Android: a ripple clipped to the caller's shape, drawn in front of the children. */
export const pressableRipple: PressableProps['android_ripple'] = { color: motion.ripple, foreground: true };
