// Shared flat ESLint config for TypeScript packages in this monorepo.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import rtl from './rtl-plugin.mjs';

export const rtlConfig = {
  plugins: { rtl },
  rules: {
    'rtl/no-physical-tailwind': 'error',
    'rtl/no-physical-style': 'error',
  },
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/.turbo/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  rtlConfig,
);
