// Shared base ESLint flat config (ESLint 9) for the Mango eSign monorepo.
// TypeScript-aware recommended rules + Turborepo env-var hygiene, with
// Prettier-conflicting stylistic rules disabled (Prettier owns formatting).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import turbo from 'eslint-plugin-turbo';
import prettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export const base = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.gen.ts',
      '**/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { turbo },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  prettier,
];

export default base;
