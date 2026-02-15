import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';
import promise from 'eslint-plugin-promise';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import jest from 'eslint-plugin-jest';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', '*.cjs', '*.mjs', 'jest.config.ts', 'scripts/**'],
  },

  // Base configs
  eslint.configs.recommended,

  // TypeScript (recommended without type-checked, add specific type-aware rules manually)
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Plugins
  promise.configs['flat/recommended'],

  // Prettier (must be last among formatting configs)
  prettier,

  // Project rules
  {
    files: ['**/*.ts'],
    plugins: {
      import: importPlugin,
      unicorn,
      sonarjs,
    },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false },
      ],

      // General
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      'func-style': ['error', 'expression'],
      'no-nested-ternary': 'error',

      // Promise
      'promise/always-return': 'error',
      'promise/catch-or-return': 'error',
      'promise/no-native': 'off',
      'promise/no-nesting': 'warn',
      'promise/no-promise-in-callback': 'warn',
      'promise/no-callback-in-promise': 'warn',
      'promise/no-new-statics': 'error',
      'promise/no-return-in-finally': 'warn',
      'promise/valid-params': 'warn',
      'promise/param-names': [
        'warn',
        {
          resolvePattern: '^_?(resolve)$|^_$',
          rejectPattern: '^_?(reject)$|^_$',
        },
      ],

      // Import
      'import/no-named-as-default': 'warn',
      'import/no-named-as-default-member': 'warn',
      'import/no-duplicates': 'warn',
      'import/no-cycle': ['error', { maxDepth: 1 }],

      // Sonarjs (cherry-picked)
      'sonarjs/cognitive-complexity': 'warn',

      // Unicorn (cherry-picked)
      'unicorn/consistent-destructuring': 'error',
      'unicorn/custom-error-definition': 'error',
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-unused-properties': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',
      'unicorn/numeric-separators-style': 'warn',
      'unicorn/prefer-at': 'warn',
      'unicorn/prefer-code-point': 'warn',
      'unicorn/prefer-date-now': 'warn',
      'unicorn/prefer-default-parameters': 'warn',
      'unicorn/prefer-export-from': 'warn',
      'unicorn/prefer-includes': 'warn',
      'unicorn/prefer-math-trunc': 'warn',
      'unicorn/prefer-modern-math-apis': 'warn',
      'unicorn/prefer-native-coercion-functions': 'warn',
      'unicorn/prefer-negative-index': 'warn',
      'unicorn/prefer-number-properties': 'warn',
      'unicorn/prefer-object-from-entries': 'warn',
      'unicorn/prefer-optional-catch-binding': 'warn',
      'unicorn/prefer-prototype-methods': 'warn',
      'unicorn/prefer-reflect-apply': 'warn',
      'unicorn/prefer-regexp-test': 'warn',
      'unicorn/prefer-set-has': 'warn',
      'unicorn/prefer-spread': 'warn',
      'unicorn/prefer-string-replace-all': 'warn',
      'unicorn/prefer-string-slice': 'warn',
      'unicorn/prefer-string-starts-ends-with': 'warn',
      'unicorn/prefer-string-trim-start-end': 'warn',
      'unicorn/prefer-switch': 'warn',
      'unicorn/prefer-ternary': 'warn',
      'unicorn/prefer-top-level-await': 'warn',
      'unicorn/prefer-type-error': 'warn',
      'unicorn/string-content': 'error',
      'unicorn/expiring-todo-comments': 'off',
    },
  },

  // Test file overrides
  {
    files: ['**/*.test.ts', '**/__test__/**/*.ts'],
    ...jest.configs['flat/recommended'],
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest/expect-expect': [
        'error',
        { assertFunctionNames: ['expect', 'expect*'] },
      ],
      'jest/no-standalone-expect': [
        'error',
        {
          additionalTestBlockFunctions: [
            'testSpending',
            'testSpending.concurrent',
            'testSpending.skip',
            'testSpending.only',
            'testSpending.todo',
          ],
        },
      ],
      'jest/no-deprecated-functions': 'off',
      // Loosen rules for tests
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
