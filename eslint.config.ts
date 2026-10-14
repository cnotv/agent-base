import javascript from '@eslint/js'
import globals from 'globals'
import jsdoc from 'eslint-plugin-jsdoc'
import typescript from 'typescript-eslint'

const functionalStyle = {
  'no-restricted-syntax': [
    'error',
    { selector: 'ClassDeclaration', message: 'Functional style: no classes.' },
    { selector: 'ClassExpression', message: 'Functional style: no classes.' },
    { selector: 'ForStatement', message: 'Use map, filter, reduce or flatMap instead of loops.' },
    { selector: 'ForInStatement', message: 'Use Object.entries with map instead of loops.' },
    { selector: 'ForOfStatement', message: 'Use map, filter, reduce or flatMap instead of loops.' },
    { selector: 'WhileStatement', message: 'Use map, filter, reduce or flatMap instead of loops.' },
    { selector: 'DoWhileStatement', message: 'Use map, filter, reduce or flatMap instead of loops.' },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  'prefer-const': 'error',
}

export default typescript.config(
  {
    ignores: ['**/node_modules/**', 'pr-preview/**'],
  },
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: functionalStyle,
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts'],
    ...jsdoc.configs['flat/recommended-typescript-error'],
    rules: {
      ...jsdoc.configs['flat/recommended-typescript-error'].rules,
      // Every exported function, however it is declared, carries a comment.
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: { FunctionDeclaration: true, ArrowFunctionExpression: true, FunctionExpression: true },
        },
      ],
      // A destructured argument is described by its type; naming its parts again adds nothing.
      'jsdoc/require-param': ['error', { checkDestructuredRoots: false }],
      'jsdoc/check-param-names': ['error', { checkDestructured: false }],
    },
  },
)
