import { SignInPrompt } from '@/features/auth/components/SignInPrompt';
import { useIsSignedIn } from '@/features/auth/sessionStore';
import { ApplicationsScreen } from '@/features/applications/screens/ApplicationsScreen';

export default function Applications() {
  const signedIn = useIsSignedIn();
  if (!signedIn) {
    return <SignInPrompt testID="applications.signin" title="Sign in to see your applications" heading="/applications" />;
  }
  return <ApplicationsScreen />;
}
