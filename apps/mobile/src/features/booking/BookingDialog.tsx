import { dateInAmman, normalizePhone } from '@nujoom/shared';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { keys, useCache, useMe, usePitches } from '@/data/api';
import type { Me, Pitch } from '@/data/types';
import { sfx } from '@/design/sound';
import { daySlots } from '@/features/pitches/logic';
import { useLocale } from '@/lib/locale';
import { Dialog, DialogLoading } from '@/ui/Dialog';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { SelectField } from '@/ui/SelectField';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

type Size = '5' | '6' | '7';

/**
 * "تأكيد حجز الملعب": confirm a slot. Payment is cash at the pitch only; stars have no cash value
 * and cannot pay for bookings (D-006.1). Until R2 the booking is recorded in the preview cache;
 * then it goes through the `create_booking` RPC, which enforces the no-overlap constraint.
 */
export function BookingDialog({
  pitchId,
  date,
  slot,
}: {
  pitchId: string;
  date: string | undefined;
  slot: string | undefined;
}) {
  const me = useMe().data;
  const pitch = usePitches().data?.find((p) => p.id === pitchId);
  // The form's initial values come from the pitch and profile, so wait for both.
  if (!pitch || !me) return <DialogLoading />;
  return <BookingForm pitch={pitch} me={me} date={date ?? dateInAmman(new Date())} slot={slot} />;
}

function BookingForm({
  pitch,
  me,
  date,
  slot,
}: {
  pitch: Pitch;
  me: Me;
  date: string;
  slot: string | undefined;
}) {
  const { t, pick, time } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const cache = useCache();

  const free = daySlots(pitch, date).filter((s) => s.state === 'free');
  const [startsAt, setStartsAt] = useState(
    free.some((s) => s.startsAt === slot) ? slot! : (free[0]?.startsAt ?? ''),
  );
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState('');
  const [size, setSize] = useState<Size>(String(pitch.size) as Size);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const normalized = normalizePhone(phone);
    const next = {
      name: name.trim() ? undefined : t('booking.nameRequired'),
      phone: normalized ? undefined : t('booking.phoneInvalid'),
    };
    setErrors(next);
    if (next.name || next.phone || !startsAt) return;

    const chosen = free.find((s) => s.startsAt === startsAt);
    if (!chosen) {
      toast.show(t('booking.slotTaken'));
      return;
    }
    setSubmitting(true);
    sfx.success();
    cache.update<Pitch[]>(keys.pitches, (all) =>
      all.map((p) =>
        p.id === pitch.id
          ? { ...p, busy: [...p.busy, { starts_at: chosen.startsAt, ends_at: chosen.endsAt }] }
          : p,
      ),
    );
    setTimeout(() => {
      setSubmitting(false);
      router.back();
      toast.show(t('booking.success', { pitch: pick(pitch.name), time: time(chosen.startsAt) }));
    }, 800);
  };

  const sizes = (['5', '6', '7'] as const).filter((s) => Number(s) <= pitch.size);

  return (
    <Dialog>
      <View className="flex-row items-center justify-between border-b border-border pb-3">
        <View className="flex-row items-center gap-2">
          <Icon name="bolt" size={22} className="text-primary" />
          <Text font="rubik" className="text-[18px] text-on-surface font-bold">
            {t('booking.title')}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          className="w-8 h-8 rounded-full bg-surface-container-high active:bg-surface-container-highest items-center justify-center"
        >
          <Icon name="close" size={18} className="text-on-surface" />
        </Pressable>
      </View>

      <View className="bg-surface-container-low p-3 rounded-xl border border-border flex-row items-center gap-3">
        {pitch.photoUrl ? (
          <Image
            source={{ uri: pitch.photoUrl }}
            style={{ width: 64, height: 56, borderRadius: 8 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-16 h-14 rounded-lg bg-surface-container-high items-center justify-center">
            <Icon name="stadium" size={28} className="text-surface-bright" />
          </View>
        )}
        <View className="flex-1 min-w-0">
          <Text font="rubik" className="text-[15px] text-on-surface font-bold" numberOfLines={1}>
            {pick(pitch.name)}
          </Text>
          <Text className="text-[11px] text-on-surface-variant">{pick(pitch.area)}</Text>
          <Text font="grotesk" className="text-[13px] text-primary font-black mt-0.5">
            {t('booking.perHour', { price: pitch.pricePerHour })}
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <Field
          label={t('booking.organizer')}
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoComplete="name"
        />
        <Field
          label={t('booking.phone')}
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="07X XXX XXXX"
          ltr
        />
        <View className="flex-row gap-2">
          {free.length ? (
            <SelectField
              label={t('booking.time')}
              options={free.map((s) => ({ value: s.startsAt, label: time(s.startsAt) }))}
              value={startsAt}
              onChange={setStartsAt}
            />
          ) : (
            <View className="flex-1 justify-end">
              <Text className="text-[12px] text-error">{t('booking.noSlots')}</Text>
            </View>
          )}
          <SelectField
            label={t('booking.format')}
            options={sizes.map((s) => ({ value: s, label: t('common.size', { n: s }) }))}
            value={size}
            onChange={setSize}
          />
        </View>

        <View className="gap-1.5 pt-1">
          <Text font="grotesk" className="text-[11px] text-on-surface-variant">
            {t('booking.payment')}
          </Text>
          <View className="p-2.5 rounded-xl border bg-surface-container-low border-secondary">
            <View className="flex-row items-center justify-between w-full">
              <Text font="rubik" className="text-[12px] font-bold text-on-surface">
                {t('booking.cash')}
              </Text>
              <View className="w-3.5 h-3.5 rounded-full border border-secondary bg-secondary items-center justify-center">
                <View className="w-1.5 h-1.5 rounded-full bg-on-secondary" />
              </View>
            </View>
            <Text font="grotesk" className="text-[11px] text-secondary font-bold mt-1">
              {t('booking.cashAmount', { price: pitch.pricePerHour })}
            </Text>
          </View>
          <Text className="text-[11px] text-on-surface-variant">{t('booking.payNote')}</Text>
        </View>

        <Pressable
          onPress={submit}
          disabled={submitting || !free.length}
          className="w-full py-3 rounded-xl bg-primary-container active:bg-primary shadow-lg active:scale-95 mt-2 items-center disabled:opacity-60"
        >
          <Text font="rubik" className="text-[16px] text-on-primary font-bold">
            {submitting ? t('booking.submitting') : t('booking.submit')}
          </Text>
        </Pressable>
      </View>
    </Dialog>
  );
}
