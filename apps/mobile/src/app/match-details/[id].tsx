import { useLocalSearchParams } from 'expo-router';

import { MatchDetailsDialog } from '@/features/match/MatchDetailsDialog';

export default function MatchDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MatchDetailsDialog bookingId={id} />;
}
