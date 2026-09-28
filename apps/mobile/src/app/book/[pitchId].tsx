import { useLocalSearchParams } from 'expo-router';

import { BookingDialog } from '@/features/booking/BookingDialog';

export default function BookRoute() {
  const { pitchId, date, slot } = useLocalSearchParams<{
    pitchId: string;
    date?: string;
    slot?: string;
  }>();
  return <BookingDialog pitchId={pitchId} date={date} slot={slot} />;
}
