/*
 * Mirrors apps/api/jest.config.cjs so both apps run the same runner.
 * Differences: jsdom (web), tsx support, and tests live in src/tests.
 */
module.exports = {
  rootDir: 'src',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        // CommonJS on purpose: jest.mock factories are hoisted, which vitest's
        // vi.mock is not. The API needs ESM for its nodenext build; the web app
        // does not, so tests transform to CJS and mocks work normally.
        useESM: false,
        diagnostics: { ignoreCodes: [151002] },
        tsconfig: {
          jsx: 'react-jsx',
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'es2022',
          esModuleInterop: true,
          allowJs: true,
          verbatimModuleSyntax: false,
          isolatedModules: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    // Allow `import x from './y.js'` in source to resolve to './y'.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules[/\\\\](?!(@cricapp)/)'],
  collectCoverageFrom: ['**/*.(t|j)s', '!tests/**', '!test/**'],
  coverageDirectory: '../coverage',
  clearMocks: true,
  maxWorkers: 1,
  testTimeout: 30000,
};
