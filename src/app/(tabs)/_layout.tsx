import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { useSession } from '@/features/auth/sessionStore';
import { TopBar } from '@/features/notifications/components/TopBar';
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

/** Signed-in area. A signed-out user (also on a deep link) is sent to login (replace: Back can't return). */
export default function TabsLayout() {
  const status = useSession((s) => s.status);
  if (status === 'restoring') return null; // splash is still up
  if (status === 'signedOut') return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        // One top bar for the four tabs, with the notification bell (website Navbar). It takes the top safe area.
        header: () => <TopBar />,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // 4 tabs at 320 pt: "Applications" must not be cut off, so 11 pt and no side padding.
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
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
            tabBarIcon: ({ color, size }) => (
              <SymbolView
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
