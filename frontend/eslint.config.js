// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    rules: {
      // SDK 57's eslint-config-expo enables React Compiler lint rules that flag
      // the standard data-loading-in-useEffect pattern used across these screens
      // (they are not runtime errors). Keep them visible as warnings so they can
      // be cleaned up incrementally instead of blocking the build.
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
