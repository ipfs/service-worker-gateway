module.exports = {
  'root': true,
  'extends': [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'standard-with-typescript'
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': { 'project': ['./tsconfig.json'] },
  'plugins': [
      '@typescript-eslint'
  ],
  'rules': {
    "@typescript-eslint/restrict-template-expressions": "off",
    "eqeqeq": ["error", "always", {"null": "ignore"}],
  },
  'ignorePatterns': ['src/**/*.test.ts', 'src/frontend/generated/*']
}
