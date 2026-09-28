import { useLocalSearchParams } from 'expo-router';

import { CodeScreen } from '@/features/auth/CodeScreen';

export default function CodeRoute() {
  const { email, sent } = useLocalSearchParams<{ email: string; sent?: string }>();
  return <CodeScreen email={email ?? ''} sent={sent === '1'} />;
}
