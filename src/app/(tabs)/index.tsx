import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useSession } from '@/features/auth/sessionStore';

// Placeholder: job listings come in Phase 2.
export default function Home() {
  const name = useSession((s) => s.user?.name);
  return (
    <PlaceholderScreen
      testID="home.screen"
      title={name ? `Hi, ${name}` : 'ApronHanger'}
      note="Job listings arrive in Phase 2."
    />
  );
}
