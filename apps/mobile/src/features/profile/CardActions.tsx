import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Me } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { copyText, shareToWhatsApp } from '@/lib/share';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

const WHATSAPP_PATH =
  'M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z';

/** WhatsApp share button, the copyable card code and the HD download link under the card. */
export function CardActions({ me }: { me: Me }) {
  const { t, pick } = useLocale();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    sfx.success();
    const text = t('profile.shareText', {
      name: me.name,
      ovr: me.ovr,
      tag: me.positionTag,
      app: t('app.name'),
      form: me.form.toFixed(1),
      position: t(`positions.${me.position}`),
      hara: [pick(me.city), me.neighborhood ? pick(me.neighborhood) : null]
        .filter(Boolean)
        .join(' - '),
      url: `https://nujoom.app/u/${me.id}`,
    });
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <View className="w-full max-w-[340px] self-center mt-4 gap-2">
      <Pressable
        onPress={share}
        className="w-full py-3 px-4 rounded-xl bg-secondary-container active:bg-emerald active:scale-[0.98] flex-row items-center justify-center gap-2.5 shadow-[0_6px_20px_rgba(0,165,114,0.35)]"
      >
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path d={WHATSAPP_PATH} fill="#00311f" />
        </Svg>
        <Text font="rubik" className="text-[18px] text-on-secondary-container font-bold">
          {t('profile.shareCard')}
        </Text>
      </Pressable>
      <View className="flex-row items-center justify-between px-1">
        <Pressable
          onPress={async () => {
            sfx.clipBeep();
            await copyText(me.cardCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex-row items-center gap-1"
        >
          <Icon name="qr_code_2" size={16} className="text-primary" />
          <Text className="text-[12px] text-on-surface-variant">
            {t('profile.cardCode', { code: me.cardCode })}
          </Text>
          {copied ? (
            <Text className="text-[10px] text-secondary">{t('profile.copied')}</Text>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => {
            sfx.success();
            toast.show(t('profile.downloadSoon'));
          }}
        >
          <Text font="grotesk" className="text-[11px] text-primary font-bold">
            {t('profile.downloadHd')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
