/** Unit tests. reflect-metadata is loaded first so @Injectable() decorators work. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['reflect-metadata'],
  moduleNameMapper: {
    '^@mango/shared/api$': '<rootDir>/../../packages/shared/dist/api.cjs',
    '^@mango/shared$': '<rootDir>/../../packages/shared/dist/index.cjs',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};
