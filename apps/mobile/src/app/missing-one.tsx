import { useLocalSearchParams } from 'expo-router';

import { MissingOneDialog } from '@/features/home/MissingOneDialog';

export default function MissingOneRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <MissingOneDialog id={id} />;
}
