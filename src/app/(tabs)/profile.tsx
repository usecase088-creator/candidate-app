import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useIsSignedIn } from '@/features/auth/sessionStore';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';

export default function Profile() {
  const signedIn = useIsSignedIn();
  if (!signedIn) {
    return <SignInPrompt testID="profile.signin" title="Sign in to see your profile" heading="/profile" />;
  }
  return <ProfileScreen />;
}
