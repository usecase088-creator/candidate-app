import { Button } from '@/components/ui/Button';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useSession } from '@/features/auth/sessionStore';

// Placeholder: the profile comes in a later phase. Sign out works now (website wording: "Sign out").
export default function Profile() {
  const signOut = useSession((s) => s.signOut);
  return (
    <PlaceholderScreen testID="profile.screen" title="Profile" note="Your profile will show here.">
      <Button
        testID="profile.signout"
        label="Sign out"
        variant="outline"
        onPress={() => void signOut('user')}
      />
    </PlaceholderScreen>
  );
}
