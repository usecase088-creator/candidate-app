import { type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { useSession } from '@/features/auth/sessionStore';
import { TopBar } from '@/features/notifications/components/TopBar';
import { tabBarHeight, TAB_LABEL_MAX_SCALE, TAB_LABEL_SIZE } from '@/theme/tabBar';
import { colors, fonts } from '@/theme/tokens';

type Tab = { name: string; title: string; testID: string; ios: SFSymbol; android: AndroidSymbol };

// PHASE-1 Task 7: placeholders until the job screens (Phase 2). Icons: SF Symbols on iOS, Material Symbols elsewhere.
const TABS: Tab[] = [
  { name: 'index', title: 'Home', testID: 'tabs.home', ios: 'house', android: 'home' },
  { name: 'search', title: 'Search', testID: 'tabs.search', ios: 'magnifyingglass', android: 'search' },
  {
    name: 'applications',
    title: 'Applications',
    testID: 'tabs.applications',
    ios: 'doc.text',
    android: 'description',
  },
  {
    name: 'profile',
    title: 'Profile',
    testID: 'tabs.profile',
    ios: 'person.crop.circle',
    android: 'account_circle',
  },
];

/**
 * The four tabs. A visitor who never signed in sees them too (guest browsing, like the website): Home and Search work,
 * and the Applications and Profile tabs ask them to sign in. Someone whose session just ended (Sign out, expired or
 * blocked, deleted) goes to the login screen with the reason (replace: Back can't return); "Browse jobs without signing
 * in" there clears the reason. Restoring shows nothing (the splash is up).
 */
export default function TabsLayout() {
  const status = useSession((s) => s.status);
  const endedReason = useSession((s) => s.signOutReason);
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (status === 'restoring') return null; // splash is still up
  if (status === 'signedOut' && endedReason !== undefined) return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        // One top bar for the four tabs, with the notification bell (website Navbar). It takes the top safe area.
        header: () => <TopBar />,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.mutedForeground,
        // 4 tabs at 320 pt: no side padding, so "Applications" fits (label size: styles.label below).
        // 4 tabs at 320 pt: "Applications" must not be cut off, so 11 pt and no side padding.
        tabBarItemStyle: { paddingHorizontal: 0 },
        // The bar must have room for the labels at large font sizes (src/theme/tabBar.ts).
        tabBarStyle: { height: tabBarHeight(fontScale, insets.bottom) },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarButtonTestID: tab.testID,
            tabBarAccessibilityLabel: tab.title,
            // At font scale 2 the labels were cut off by the bar: they grow at most 1.3 times, on one line.
            tabBarLabel: ({ color }) => (
              <Text
                testID={`${tab.testID}.label`}
                numberOfLines={1}
                maxFontSizeMultiplier={TAB_LABEL_MAX_SCALE}
                style={[styles.label, { color }]}
              >
                {tab.title}
              </Text>
            ),
            tabBarIcon: ({ color, size }) => (
              <Icon
                name={{ ios: tab.ios, android: tab.android, web: tab.android }}
                tintColor={color}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

// 11 pt labels: "Applications" fits under its icon at 320 pt.
const styles = StyleSheet.create({ label: { fontFamily: fonts.medium, fontSize: TAB_LABEL_SIZE } });
