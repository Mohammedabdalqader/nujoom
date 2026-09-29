import { useLocalSearchParams } from 'expo-router';

import { PitchDetailDialog } from '@/features/pitches/PitchDetailDialog';

export default function PitchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PitchDetailDialog pitchId={id} />;
}
