import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// Feature-sliced boundaries (ARCHITECTURE.md §2):
// app → features → shared. Features talk to each other only through index.ts.
// Inside a feature, import its own internals with relative paths.
const boundaryZones = [
  {
    target: './src/shared',
    from: ['./src/features', './src/app', './src/mocks'],
    message: 'shared/ must stay domain-agnostic: never import features, app or mocks.',
  },
  {
    target: './src/features',
    from: './src/app',
    message: 'Features must not import from app/.',
  },
  {
    target: './src/features',
    from: './src/mocks',
    message:
      'Features reach the mock backend through shared/api only. (prototype-toolbar is the exception.)',
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strict,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import/no-default-export': 'error',
      'import/no-restricted-paths': ['error', { zones: boundaryZones }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message: "Import other features through their public index.ts ('@/features/<name>').",
            },
          ],
        },
      ],
    },
  },
  {
    // Next.js special files and config require default exports.
    files: [
      'src/app/**/{page,layout,loading,error,not-found,global-error,template,default}.tsx',
      '*.config.{ts,mjs}',
      'e2e/**',
    ],
    rules: { 'import/no-default-export': 'off' },
  },
  {
    // The prototype toolbar is the one feature allowed to drive the mock backend directly.
    files: ['src/features/prototype-toolbar/**'],
    rules: { 'import/no-restricted-paths': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/**',
    '.claude/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
