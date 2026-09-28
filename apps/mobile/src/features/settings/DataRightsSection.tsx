import { errorKey, formatDateTime } from '@nujoom/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { getSource } from '@/data/source';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { useSession } from '@/lib/session';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

/**
 * "Download my data" and "Delete my account" (S1-9, spec §7, D-038–D-040). The download is a
 * private file behind a 7-day link, opened by the user's own tap. Deletion waits 7 days and can
 * be cancelled here until then; the scheduled date comes from the server.
 */
export function DataRightsSection() {
  const { t, locale } = useLocale();
  const { color } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const queryKey = ['data-requests', session?.userId];
  const requests = useQuery({ queryKey, queryFn: () => getSource().dataRights.list() });
  const [busy, setBusy] = useState<'export' | 'delete' | 'cancel' | null>(null);
  const [download, setDownload] = useState<{ url: string; expiresAt: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingDeletion = requests.data?.find(
    (r) => r.kind === 'deletion' && r.status === 'pending',
  );
  const day = (iso: string) => formatDateTime(iso, locale, { dateStyle: 'medium' });

  const run = async (kind: 'export' | 'delete' | 'cancel', task: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await task();
      await queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="gap-4">
      <Text className="text-[14px] leading-[22px] text-on-surface-variant">
        {t('settings.dataExplain')}
      </Text>

      {download ? (
        <View className="rounded-xl bg-surface-container-low border border-border p-3 gap-3">
          <Text className="text-[14px] leading-[22px] text-on-surface">
            {t('settings.downloadReady', { date: day(download.expiresAt) })}
          </Text>
          <Pressable
            onPress={() => void Linking.openURL(download.url)}
            accessibilityRole="link"
            className="min-h-[48px] rounded-xl bg-primary-container active:bg-primary items-center justify-center flex-row gap-2"
          >
            <Icon name="download" size={20} className="text-on-primary" />
            <Text font="rubik" className="text-[16px] text-on-primary font-bold">
              {t('settings.openDownload')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() =>
            void run('export', async () =>
              setDownload(await getSource().dataRights.requestExport()),
            )
          }
          disabled={busy !== null}
          accessibilityRole="button"
          className="min-h-[48px] rounded-xl border border-border-strong items-center justify-center flex-row gap-2"
        >
          {busy === 'export' ? (
            <ActivityIndicator color={color('primary')} />
          ) : (
            <Icon name="download" size={20} className="text-primary" />
          )}
          <Text font="rubik" className="text-[16px] text-on-surface font-bold">
            {busy === 'export' ? t('settings.preparing') : t('settings.download')}
          </Text>
        </Pressable>
      )}

      {pendingDeletion ? (
        <View className="rounded-xl border border-error/50 bg-tint-red p-3 gap-3">
          <Text
            accessibilityLiveRegion="polite"
            className="text-[15px] leading-[23px] text-on-surface"
          >
            {t('settings.deleteScheduled', { date: day(pendingDeletion.scheduledFor) })}
          </Text>
          <Pressable
            onPress={() =>
              void run('cancel', async () => {
                await getSource().dataRights.cancelDeletion();
                toast.show(t('settings.deleteCancelled'));
              })
            }
            disabled={busy !== null}
            accessibilityRole="button"
            className="min-h-[48px] rounded-xl bg-primary-container active:bg-primary items-center justify-center"
          >
            <Text font="rubik" className="text-[16px] text-on-primary font-bold">
              {t('settings.cancelDelete')}
            </Text>
          </Pressable>
        </View>
      ) : confirming ? (
        <View className="rounded-xl border border-error/50 p-3 gap-3">
          <Text className="text-[15px] leading-[23px] text-on-surface">
            {t('settings.deleteExplain')}
          </Text>
          <Pressable
            onPress={() =>
              void run('delete', async () => {
                await getSource().dataRights.requestDeletion();
                setConfirming(false);
              })
            }
            disabled={busy !== null}
            accessibilityRole="button"
            className="min-h-[48px] rounded-xl border border-error items-center justify-center"
          >
            <Text font="rubik" className="text-[16px] text-error font-bold">
              {t('settings.deleteConfirm')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setConfirming(false)}
            className="min-h-[44px] items-center justify-center"
          >
            <Text className="text-[15px] text-on-surface-variant">{t('settings.keep')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setConfirming(true)}
          disabled={busy !== null || requests.isPending}
          accessibilityRole="button"
          className="min-h-[48px] rounded-xl border border-error/50 items-center justify-center flex-row gap-2"
        >
          <Icon name="delete" size={20} className="text-error" />
          <Text font="rubik" className="text-[16px] text-error font-bold">
            {t('settings.delete')}
          </Text>
        </Pressable>
      )}

      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-[14px] text-error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
