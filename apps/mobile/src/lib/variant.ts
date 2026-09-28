/**
 * Which build this is (contract §7). `demo` builds show labelled sample data and have no backend;
 * everything else is production. Development bundles without a variant run as demo
 * (see `selectSource` in src/data/source.ts), so this mirrors that rule.
 */
export const IS_DEMO: boolean =
  process.env.EXPO_PUBLIC_APP_VARIANT === 'demo' ||
  (__DEV__ && !process.env.EXPO_PUBLIC_APP_VARIANT);
