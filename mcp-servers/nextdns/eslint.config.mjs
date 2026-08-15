import stylistic from '@stylistic/eslint-plugin';
import prettierFlatConfig from 'eslint-config-prettier/flat';
import perfectionist from 'eslint-plugin-perfectionist';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    extends: [...tseslint.configs.recommendedTypeChecked],
    // type-aware, scoped to src/ — tsconfig.test.json covers *.test.ts too, tsconfig.json alone doesn't
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      // ts-expect-error must have a description explaining why.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          minimumDescriptionLength: 10,
          'ts-expect-error': 'allow-with-description',
        },
      ],
      // Enforce `import type` for type-only imports.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      // Forbid `any`; use `unknown` plus type narrowing instead.
      '@typescript-eslint/no-explicit-any': 'error',
      // Prevent `import type` from triggering side effects.
      '@typescript-eslint/no-import-type-side-effects': 'error',
      // Discourage non-null assertions; prefer optional chaining or guards.
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Unused vars: allow the _ prefix for intentional ignores.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  // General best practices.
  {
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    plugins: { perfectionist },
    rules: {
      ...perfectionist.configs['recommended-natural'].rules,
      'perfectionist/sort-exports': ['error', { order: 'asc', type: 'natural' }],
      'perfectionist/sort-modules': 'off',
      'perfectionist/sort-named-imports': ['error', { order: 'asc', type: 'natural' }],
    },
  },
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', next: 'return', prev: '*' },
        { blankLine: 'always', next: '*', prev: ['const', 'let', 'var'] },
        { blankLine: 'any', next: ['const', 'let', 'var'], prev: ['const', 'let', 'var'] },
        { blankLine: 'always', next: '*', prev: 'directive' },
        { blankLine: 'any', next: 'directive', prev: 'directive' },
      ],
    },
  },
  {
    plugins: { security },
    rules: {
      // Computed property access is flagged for review, not banned outright.
      'security/detect-object-injection': 'warn',
    },
  },
  {
    plugins: { sonarjs },
    rules: {
      'sonarjs/todo-tag': 'warn',
    },
  },
  // Keep this last so ESLint does not duplicate formatting decisions owned by Prettier.
  prettierFlatConfig,
  // Ignores.
  globalIgnores(['dist/**', 'node_modules/**', 'coverage/**']),
]);
