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
    // Components import css (e.g. Skeletons pulls react-loading-skeleton.css).
    // Jest has no css pipeline, so map every stylesheet to a stub.
    '\\.(css|scss|sass|less)$': '<rootDir>/test/styleStub.js',
  },
  transformIgnorePatterns: ['node_modules[/\\\\](?!(@cricapp)/)'],
  // `*.(t|j)s?(x)` — the `?(x)` is required. Without it the glob matches only
  // .ts/.js and every .tsx component is silently excluded from the report,
  // which understated coverage against ~285 files.
  collectCoverageFrom: ['**/*.(t|j)s?(x)', '!tests/**', '!test/**'],
  coverageDirectory: '../coverage',
  // Ratchet: set just under the real number so coverage can only go up. These
  // track the whole app including the ~280 untested .tsx files, so they are low
  // on purpose — raise them as tests are added.
  coverageThreshold: {
    global: {
      statements: 28,
      branches: 21,
      functions: 26,
      lines: 28,
    },
  },
  clearMocks: true,
  maxWorkers: 1,
  testTimeout: 30000,
};
