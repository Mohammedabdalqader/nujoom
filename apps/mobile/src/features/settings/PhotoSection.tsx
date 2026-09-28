import { errorKey, initials } from '@nujoom/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { keys, useMe } from '@/data/api';
import { getSource } from '@/data/source';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { Avatar } from '@/ui/Avatar';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

/** Square, 512 px, JPEG: always under the avatars bucket's 512 KB limit. */
const SIZE = 512;

/**
 * The profile photo (S1-7): pick from the library (no camera), crop square, shrink on the device,
 * upload to the user's own folder, then point the profile at it. Who can see it follows the
 * profile's visibility (storage RLS, spec §7); a youth's photo stays with their guardian's choice.
 */
export function PhotoSection() {
  const { t } = useLocale();
  const { color } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const me = useMe();
  const [busy, setBusy] = useState<'pick' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photo = me.data?.avatarUrl ?? null;

  const finish = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: keys.me });
    toast.show(message);
  };

  const pick = async () => {
    setError(null);
    const picked = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;
    setBusy('pick');
    try {
      const context = ImageManipulator.manipulate(asset.uri);
      context.resize({ width: SIZE, height: SIZE });
      const small = await (
        await context.renderAsync()
      ).saveAsync({
        compress: 0.8,
        format: SaveFormat.JPEG,
      });
      await getSource().setAvatar({ uri: small.uri, mimeType: 'image/jpeg' });
      await finish(t('settings.photoSaved'));
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setError(null);
    setBusy('remove');
    try {
      await getSource().removeAvatar();
      await finish(t('settings.photoRemoved'));
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-4">
        <Avatar
          uri={photo}
          initials={initials(me.data?.name ?? '')}
          size="w-20 h-20"
          className="border-2 border-primary/50"
          textClassName="text-[22px] text-on-surface"
        />
        <Text className="flex-1 text-[14px] leading-[22px] text-on-surface-variant">
          {t('settings.photoHint')}
        </Text>
      </View>
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => void pick()}
          disabled={busy !== null}
          accessibilityRole="button"
          className="flex-1 min-h-[48px] rounded-xl bg-primary-container active:bg-primary items-center justify-center flex-row gap-2"
        >
          {busy === 'pick' ? <ActivityIndicator color={color('on-primary')} /> : null}
          <Text font="rubik" className="text-[15px] text-on-primary font-bold">
            {photo ? t('settings.changePhoto') : t('settings.choosePhoto')}
          </Text>
        </Pressable>
        {photo ? (
          <Pressable
            onPress={() => void remove()}
            disabled={busy !== null}
            accessibilityRole="button"
            className="min-h-[48px] px-4 rounded-xl border border-border-strong items-center justify-center"
          >
            <Text className="text-[15px] text-on-surface-variant">{t('settings.removePhoto')}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-[14px] text-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
