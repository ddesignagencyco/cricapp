module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    // ts-jest overrides `module` to CommonJS for Jest, which warns about the
    // nodenext setting the API builds with. Enabling isolatedModules instead
    // emits ESM that Jest's CommonJS loader cannot parse.
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        useESM: true,
        diagnostics: { ignoreCodes: [151002] },
        // Prisma 7's generated client reads import.meta.url, which the CommonJS
        // output Jest runs cannot parse; see test/import-meta-url.transformer.cjs.
        astTransformers: { before: ['<rootDir>/../test/import-meta-url.transformer.cjs'] },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules[/\\\\](?!@cricapp)',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Prisma 7 loads its query compiler from ESM-only .mjs files; Jest runs
    // CommonJS, so use the CommonJS builds Prisma ships beside them.
    '^@prisma/client/runtime/(.*)\\.mjs$': '@prisma/client/runtime/$1.js',
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!generated/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  maxWorkers: 1,
  testTimeout: 30000,
};