import { addDays, dateInAmman, errorKey, nextDates, normalizePhone } from '@nujoom/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { useCreateBooking, useDaySlots } from '@/data/api';
import { newRequestId, type BookingReceipt } from '@/data/booking';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/**
 * Booking a verified field from its page (contract agentic_system/contracts/booking.md, D-078).
 * Slots come fresh from the server for the chosen day (pitch_day_slots); only free ones can be
 * picked. A booking is shown as done only from the server's receipt; a lost request is retried
 * with the same request id, so it can never book twice. Paid in cash at the pitch.
 * Until recording exists (R4), app bookings are unrecorded: offering a "recorded match" now would
 * promise something we can't do (honesty rule).
 */
export function BookingSection({ pitchId }: { pitchId: string }) {
  const { t, day, date: shortDate, time, jod } = useLocale();
  const { color } = useTheme();
  const today = dateInAmman(new Date());
  const days = nextDates(today, 14);
  const [date, setDate] = useState(today);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(() => newRequestId());
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const slots = useDaySlots(pitchId, date);
  const create = useCreateBooking();

  const pickDay = (d: string) => {
    setDate(d);
    setStartsAt(null);
  };
  const free = slots.data?.slots.filter((s) => s.state !== 'past') ?? [];
  // A pick only counts while the server still lists it as free: when someone else takes it (or it
  // passes), the choice drops and the button asks for a time again.
  const picked = free.some((s) => s.startsAt === startsAt && s.state === 'free') ? startsAt : null;

  const book = () => {
    if (!picked) return;
    const contactPhone = phone.trim() ? normalizePhone(phone) : null;
    if (phone.trim() && !contactPhone) {
      setPhoneError(t('catalog.booking.phoneInvalid'));
      return;
    }
    setPhoneError(null);
    create.mutate(
      { pitchId, startsAt: picked, recorded: false, contactPhone, requestId },
      {
        onSuccess: (r) => {
          sfx.success();
          setReceipt(r);
          setStartsAt(null);
          setRequestId(newRequestId()); // the next booking is a new request
        },
      },
    );
  };

  if (receipt) {
    return (
      <View className="bg-surface-container-low rounded-xl border border-secondary/60 p-3 gap-1.5">
        <View className="flex-row items-center gap-2">
          <Icon name="check_circle" size={20} className="text-secondary" />
          <Text font="rubik" className="text-[15px] text-secondary font-bold">
            {t('catalog.booking.done')}
          </Text>
        </View>
        <Text className="text-[13px] text-on-surface">
          {t('catalog.booking.when', {
            day: day(receipt.startsAt),
            date: shortDate(receipt.startsAt),
            from: time(receipt.startsAt),
            to: time(receipt.endsAt),
          })}
        </Text>
        {receipt.total !== null ? (
          <Text font="grotesk" className="text-[13px] text-primary font-bold">
            {t('catalog.booking.total', { total: jod(receipt.total) })}
          </Text>
        ) : null}
        <Text className="text-[11px] text-on-surface-variant">{t('booking.payNote')}</Text>
        <Pressable
          onPress={() => setReceipt(null)}
          accessibilityRole="button"
          className="self-start mt-1 px-3 py-2 rounded-lg bg-surface-container-high active:bg-surface-container-highest"
        >
          <Text font="rubik" className="text-[13px] text-primary font-bold">
            {t('catalog.booking.again')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text font="rubik" className="text-[14px] text-on-surface font-bold">
        {t('catalog.booking.title')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {days.map((d) => {
          const on = d === date;
          const iso = `${d}T12:00:00+03:00`;
          return (
            <Pressable
              key={d}
              onPress={() => pickDay(d)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              className={`min-w-[64px] px-2 py-1.5 rounded-lg border items-center ${on ? 'bg-primary-container border-primary-container' : 'border-border-strong'}`}
            >
              <Text
                font="grotesk"
                className={`text-[10px] ${on ? 'text-on-primary' : 'text-on-surface-variant'}`}
              >
                {d === today
                  ? t('catalog.booking.today')
                  : d === addDays(today, 1)
                    ? t('catalog.booking.tomorrow')
                    : day(iso)}
              </Text>
              <Text
                font="rubik"
                className={`text-[13px] font-bold ${on ? 'text-on-primary' : 'text-on-surface'}`}
              >
                {shortDate(iso)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {slots.isLoading ? (
        <ActivityIndicator color={color('primary')} />
      ) : slots.isError ? (
        <View className="items-center gap-2">
          <Text className="text-[13px] text-on-surface-variant text-center">
            {t('catalog.booking.loadError')}
          </Text>
          <Pressable
            onPress={() => void slots.refetch()}
            accessibilityRole="button"
            className="px-3 py-1.5 rounded-lg bg-surface-container-high active:bg-surface-container-highest"
          >
            <Text font="rubik" className="text-[13px] text-primary font-bold">
              {t('errors.retry')}
            </Text>
          </Pressable>
        </View>
      ) : free.some((s) => s.state === 'free') ? (
        <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
          {free.map((s) => {
            const on = s.startsAt === picked;
            const busy = s.state === 'busy';
            return (
              <Pressable
                key={s.startsAt}
                disabled={busy}
                onPress={() => setStartsAt(s.startsAt)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, disabled: busy }}
                accessibilityLabel={
                  busy ? `${time(s.startsAt)} ${t('catalog.booking.busy')}` : time(s.startsAt)
                }
                className={`min-h-[40px] px-3 rounded-lg border justify-center ${on ? 'bg-primary-container border-primary-container' : busy ? 'border-border opacity-40' : 'border-border-strong'}`}
              >
                <Text
                  font="grotesk"
                  className={`text-[13px] ${on ? 'text-on-primary font-bold' : busy ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}
                >
                  {time(s.startsAt)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text className="text-[13px] text-on-surface-variant">{t('catalog.booking.noTimes')}</Text>
      )}

      <Field
        label={t('catalog.booking.phone')}
        value={phone}
        onChangeText={setPhone}
        error={phoneError ?? undefined}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="07X XXX XXXX"
        ltr
      />

      {create.isError ? (
        <Text accessibilityRole="alert" className="text-[13px] text-error">
          {t(errorKey(create.error))}
        </Text>
      ) : null}

      <Pressable
        onPress={book}
        disabled={!picked || create.isPending}
        accessibilityRole="button"
        accessibilityState={{ disabled: !picked || create.isPending, busy: create.isPending }}
        className="w-full py-3 rounded-xl bg-primary-container active:bg-primary items-center disabled:opacity-50"
      >
        <Text font="rubik" className="text-[16px] text-on-primary font-bold">
          {create.isPending
            ? t('catalog.booking.booking')
            : picked
              ? t('catalog.booking.book', { time: time(picked) })
              : t('catalog.booking.pickTime')}
        </Text>
      </Pressable>
      <Text className="text-[11px] text-on-surface-variant text-center">
        {t('booking.payNote')}
      </Text>
    </View>
  );
}
