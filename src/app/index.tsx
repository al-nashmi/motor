import { Redirect } from 'expo-router';
import { useStore } from '@/store/useStore';

export default function Index() {
  const user = useStore((s) => s.user);
  const onboarded = useStore((s) => s.onboarded);
  if (!user) return <Redirect href="/welcome" />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
