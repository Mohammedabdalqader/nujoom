import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import type { QaStadiumPhoto } from '@/features/pitches/catalogPhotoQa';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

export function CatalogPhotoQaPreview({ photos }: { photos: QaStadiumPhoto[] }) {
  const { t } = useLocale();

  return (
    <View className="gap-3 pt-2">
      <View className="gap-1">
        <Text font="rubik" className="text-[18px] font-bold text-on-surface">
          {t('catalog.photoQa.title')}
        </Text>
        <Text className="text-[13px] text-on-surface-variant">{t('catalog.photoQa.intro')}</Text>
      </View>
      {photos.map((photo) => (
        <PhotoQaCard key={photo.sourceUrl} photo={photo} />
      ))}
      <Text className="text-[12px] text-on-surface-variant">{t('catalog.photoQa.notListing')}</Text>
    </View>
  );
}

function PhotoQaCard({ photo }: { photo: QaStadiumPhoto }) {
  const { t, pick } = useLocale();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <View className="rounded-lg border border-border bg-surface-container overflow-hidden">
      {imageFailed ? (
        <View className="h-[180px] bg-surface-container-high items-center justify-center gap-2 px-4">
          <Icon name="stadium" size={28} className="text-on-surface-variant" />
          <Text className="text-[13px] text-on-surface-variant text-center">
            {t('catalog.photoQa.imageUnavailable')}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: photo.imageUrl }}
          style={{ width: '100%', height: 180 }}
          contentFit="cover"
          accessibilityLabel={pick(photo.name)}
          onError={() => setImageFailed(true)}
        />
      )}
      <View className="p-3 gap-1">
        <Text font="rubik" className="text-[16px] font-bold text-on-surface">
          {pick(photo.name)}
        </Text>
        <Text className="text-[13px] text-on-surface-variant">{pick(photo.city)}</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${t('catalog.photoQa.source')}: ${photo.credit}`}
          onPress={() => void Linking.openURL(photo.sourceUrl)}
          className="min-h-[44px] flex-row items-center gap-1 self-start py-2"
        >
          <Icon name="open_in_new" size={16} className="text-primary" />
          <Text className="text-[12px] text-primary">{`${t('catalog.photoQa.source')} · ${photo.credit}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}
