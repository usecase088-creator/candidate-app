import { PlaceholderScreen } from '@/components/PlaceholderScreen';

// Placeholder: the applications list comes in a later phase. Website title: "My Applications".
export default function Applications() {
  return (
    <PlaceholderScreen
      testID="applications.screen"
      title="My Applications"
      note="Your applications will show here."
    />
  );
}
