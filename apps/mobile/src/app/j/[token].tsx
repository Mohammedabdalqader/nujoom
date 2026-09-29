import { useLocalSearchParams } from 'expo-router';

import { JoinScreen } from '@/features/invites/JoinScreen';

/** A match's join link: https://<site>/j/<token> or nujoom://j/<token> (contract invites.md). */
export default function JoinLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <JoinScreen token={token ?? ''} />;
}
