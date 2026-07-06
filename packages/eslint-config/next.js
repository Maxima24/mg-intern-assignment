// ESLint flat config for Next.js apps in the monorepo: base + Next core-web-vitals rules.
import next from '@next/eslint-plugin-next';
import { base } from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export const nextConfig = [
  ...base,
  {
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },
];

export default nextConfig;
