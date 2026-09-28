import { useLocalSearchParams } from 'expo-router';

import { GuardianApproveScreen } from '@/features/guardian/GuardianApproveScreen';

/** The approval email's link: nujoom://guardian/accept/<token> (S1-11). */
export default function GuardianAccept() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <GuardianApproveScreen token={token ?? ''} />;
}
