/**
 * Shared Prettier config for the Mango eSign monorepo.
 * Mirrors the house style used across the developer's other repos
 * (single quotes, trailing commas everywhere, 100-col width).
 */
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
};
