import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Build variants (contract §7, C-005). `app.json` holds the production app; a demo build gets its
 * own app id and name so it can never be confused with (or update over) the real app.
 * EAS builds refuse to start with a missing or wrong variant, or a production build without
 * backend configuration. Local `expo start` reads `.env.development` (demo by default).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.EXPO_PUBLIC_APP_VARIANT;
  const demo = variant === 'demo';

  if (process.env.EAS_BUILD) {
    if (variant !== 'demo' && variant !== 'production') {
      throw new Error('EAS builds need EXPO_PUBLIC_APP_VARIANT=production or demo (see eas.json).');
    }
    if (
      variant === 'production' &&
      (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
    ) {
      throw new Error(
        'Production builds need EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }
    if (
      demo &&
      (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
    ) {
      throw new Error('Demo builds must not carry backend credentials.');
    }
  }

  if (!demo) return config as ExpoConfig;
  return {
    ...config,
    name: `${config.name} · تجريبي`,
    slug: config.slug ?? 'nujoom',
    ios: { ...config.ios, bundleIdentifier: 'app.nujoom.hara.demo' },
    android: { ...config.android, package: 'app.nujoom.hara.demo' },
  };
};
