import next from '@mango/eslint-config/next';

export default [
  ...next,
  {
    settings: {
      next: { rootDir: import.meta.dirname },
    },
  },
];
