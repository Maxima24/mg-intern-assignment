// ESLint flat config for Node/NestJS apps: base + Node globals + decorator-friendly relaxations.
import globals from 'globals';
import { base } from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export const nodeConfig = [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // NestJS leans on decorators + DI; these would be noisy false positives.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];

export default nodeConfig;
