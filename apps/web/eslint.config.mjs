import next from '@next/eslint-plugin-next';
import base from '@nujoom/config/eslint';

export default [
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...base,
  {
    plugins: { '@next/next': next },
    rules: { ...next.configs.recommended.rules, ...next.configs['core-web-vitals'].rules },
  },
];
