import { starsTier, starsToNextTier } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useConfig } from '@/data/config';
import type { StarsReason, Wallet } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { RichText } from '@/ui/RichText';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';

const WAYS: { reason: StarsReason; emoji: string; border: string; chip: string }[] = [
  {
    reason: 'tournament_win',
    emoji: '🏆',
    border: 'border-primary/20',
    chip: 'bg-primary-container/20 text-primary',
  },
  {
    reason: 'mvp',
    emoji: '🥇',
    border: 'border-secondary/20',
    chip: 'bg-secondary-container/20 text-secondary',
  },
  {
    reason: 'match_counted',
    emoji: '⚽',
    border: 'border-border',
    chip: 'bg-surface-bright text-on-surface',
  },
  {
    reason: 'hat_trick',
    emoji: '🎯',
    border: 'border-border',
    chip: 'bg-surface-bright text-primary',
  },
];

/**
 * "المحفظة الرقمية ورصيد النجوم": stars are reward points with no cash value and cannot pay for
 * bookings (D-006.1). The prototype's cash-equivalent line and "book with stars" button are gone;
 * the earn cards show real progress instead of demo "simulate" buttons.
 */
export function WalletSection({ wallet }: { wallet: Wallet }) {
  const { t, number } = useLocale();
  const router = useRouter();
  const config = useConfig();
  const tier = starsTier(wallet.totalEarned, config.stars);
  const toNext = starsToNextTier(wallet.totalEarned, config.stars);
  const nextTier = tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : 'legend';
  const tierStars = { bronze: '⭐', silver: '⭐⭐', gold: '⭐⭐⭐', legend: '⭐⭐⭐⭐' }[tier];

  return (
    <View className="gap-3">
      <SectionHeader
        icon="account_balance_wallet"
        iconSize={22}
        title={t('profile.wallet.title')}
        trailing={
          <View className="px-2 py-0.5 rounded bg-surface-container-high">
            <Text font="grotesk" className="text-[11px] text-primary font-bold">
              {t('profile.wallet.instant')}
            </Text>
          </View>
        }
      />

      <View className="rounded-2xl bg-gradient-to-br from-card-gold via-surface-container to-surface-container-low p-4 border border-primary/40 shadow-[0_8px_30px_rgba(245,158,11,0.15)] overflow-hidden">
        <View className="absolute -top-14 self-center w-56 h-36 bg-primary-container/20 rounded-full blur-[60px]" />
        <View className="flex-row items-center justify-between pb-3 border-b border-primary/15">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 items-center justify-center">
              <Icon name="account_balance_wallet" filled size={20} className="text-primary" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text font="rubik" className="text-[16px] font-bold text-on-surface">
                  {t('profile.wallet.name')}
                </Text>
                <View className="bg-primary-container px-1.5 rounded-full">
                  <Text font="grotesk" className="text-[10px] text-on-primary font-black">
                    {t('profile.wallet.badge')}
                  </Text>
                </View>
              </View>
              <Text className="text-[11px] text-on-surface-variant">{t('profile.wallet.sub')}</Text>
            </View>
          </View>
          <View className="bg-surface-bright/80 border border-primary/30 px-2 py-0.5 rounded-full flex-row items-center gap-1">
            <Text font="grotesk" className="text-[11px] text-primary font-bold">
              {t(`profile.wallet.tier.${tier}`)}
            </Text>
            <Text className="text-xs">{tierStars}</Text>
          </View>
        </View>

        <View className="py-4 items-center">
          <Text className="text-[12px] text-on-surface-variant font-medium">
            {t('profile.wallet.balanceLabel')}
          </Text>
          <View className="flex-row items-baseline gap-2 mt-1">
            <Text className="text-[28px]">⭐</Text>
            <Text
              font="grotesk"
              className="text-[42px] leading-[46px] font-black text-primary tracking-tight text-shadow-[0_2px_12px_rgba(245,158,11,0.4)]"
            >
              {number(wallet.balance)}
            </Text>
            <Text font="rubik" className="text-[16px] text-primary-fixed font-bold">
              {t('profile.wallet.unit')}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center gap-2 bg-surface-container-low border border-primary/30 px-3 py-1.5 rounded-xl">
            <Icon name="stars" size={16} className="text-secondary" />
            <RichText
              className="text-[12px] text-on-surface"
              boldClassName="text-secondary font-bold"
            >
              {t('profile.wallet.totalEarned', { value: number(wallet.totalEarned) })}
            </RichText>
            <Text className="text-outline-variant">•</Text>
            <Text font="grotesk" className="text-[10px] text-on-surface-variant">
              {toNext === null
                ? t('profile.wallet.topTier')
                : t('profile.wallet.nextTier', {
                    value: number(toNext),
                    tier: t(`profile.wallet.tier.${nextTier}`),
                  })}
            </Text>
          </View>
          <Text className="text-[10px] text-on-surface-variant mt-1.5">
            {t('profile.wallet.noCash')}
          </Text>
        </View>

        <View className="flex-row gap-2 pt-1">
          <Pressable
            onPress={() => {
              sfx.clipBeep();
              router.navigate('/pitches');
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-secondary-container active:bg-emerald flex-row items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(0,165,114,0.3)] active:scale-95"
          >
            <Icon name="stadium" size={18} className="text-on-secondary-container" />
            <Text font="rubik" className="text-[14px] text-on-secondary-container font-bold">
              {t('profile.wallet.playEarn')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              sfx.clipBeep();
              router.push('/wallet');
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-surface-container-high active:bg-surface-container-highest flex-row items-center justify-center gap-1.5 border border-surface-container-highest"
          >
            <Icon name="receipt_long" size={18} className="text-primary" />
            <Text font="rubik" className="text-[14px] text-on-surface font-bold">
              {t('profile.wallet.history')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="rounded-xl bg-surface-container p-3.5 border border-border gap-2.5 shadow-md">
        <View className="flex-row items-center justify-between pb-1 border-b border-border/60">
          <View className="flex-row items-center gap-1.5">
            <Icon name="military_tech" size={20} className="text-primary" />
            <Text font="rubik" className="text-[15px] font-bold text-on-surface">
              {t('profile.wallet.earnTitle')}
            </Text>
          </View>
          <Text font="grotesk" className="text-[11px] text-secondary font-bold">
            {t('profile.wallet.earnFree')}
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2 pt-1">
          {WAYS.map((way) => {
            const [chipBg, chipText] = way.chip.split(' ');
            const locked = way.reason === 'tournament_win';
            return (
              <View
                key={way.reason}
                className={`w-[48.5%] bg-surface-container-low p-2.5 rounded-xl border ${way.border}`}
              >
                <View className="flex-row items-start justify-between">
                  <Text className="text-xl">{way.emoji}</Text>
                  <View className={`px-1.5 py-0.5 rounded ${chipBg}`}>
                    <Text font="grotesk" className={`text-[12px] font-black ${chipText}`}>
                      {`+${config.stars[way.reason]} ⭐`}
                    </Text>
                  </View>
                </View>
                <View className="mt-2">
                  <Text font="rubik" className="text-[13px] font-bold text-on-surface">
                    {t(`profile.wallet.ways.${way.reason}.title`)}
                  </Text>
                  <Text className="text-[10px] text-on-surface-variant mt-0.5">
                    {t(`profile.wallet.ways.${way.reason}.sub`)}
                  </Text>
                </View>
                <View className="mt-2 py-1 px-2 rounded-lg bg-surface-container-high items-center">
                  <Text
                    font="grotesk"
                    className={`text-[11px] font-bold ${locked ? 'text-on-surface-variant' : 'text-primary'}`}
                  >
                    {t(`profile.wallet.ways.${way.reason}.status`, {
                      count: wallet.counts[way.reason],
                    })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
