import * as Clipboard from 'expo-clipboard';
import { Linking, Platform, Share } from 'react-native';

/**
 * Shares text to WhatsApp (spec §6.5: invites go out from the organizer's phone; no WhatsApp API).
 * Falls back to the system share sheet, then to the clipboard, so a share never silently fails.
 * Returns 'copied' when the text only reached the clipboard.
 */
export async function shareToWhatsApp(text: string): Promise<'shared' | 'copied'> {
  const encoded = encodeURIComponent(text);
  const url =
    Platform.OS === 'web' ? `https://wa.me/?text=${encoded}` : `whatsapp://send?text=${encoded}`;
  try {
    // openURL rejects when WhatsApp is not installed (no package-visibility query needed).
    await Linking.openURL(url);
    return 'shared';
  } catch {
    try {
      await Share.share({ message: text });
      return 'shared';
    } catch {
      await Clipboard.setStringAsync(text);
      return 'copied';
    }
  }
}

export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
