import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * The prototype's `navigator.vibrate` patterns (D-018): [100, 50, 100] when a clip is saved,
 * 80 ms for a check-in scan. Haptics are skipped on web.
 */
export const haptics = {
  clip(): void {
    if (Platform.OS === 'web') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
  },
  tap(): void {
    if (Platform.OS === 'web') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success(): void {
    if (Platform.OS === 'web') return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
};
