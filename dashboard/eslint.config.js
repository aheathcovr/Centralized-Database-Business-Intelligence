import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Disable prettier rules to avoid conflicts
  prettier,
  
  // Base JS config
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      'next-env.d.ts',
    ],
  },
  
  // Next.js recommended rules
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
    },
  },
  
  // TypeScript files
  ...tseslint.configs.recommended,
  
  // Import plugin - use flat configs for ESLint 10 compatibility
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    ...importPlugin.flatConfigs.recommended,
    settings: {
      'import/resolver': {
        typescript: {},
      },
    },
  },
  
  // Import plugin - TypeScript specific rules
  {
    files: ['**/*.{ts,tsx}'],
    ...importPlugin.flatConfigs.typescript,
  },
  
  // JSX a11y plugin - use flat configs for ESLint 10 compatibility
  {
    files: ['**/*.{jsx,tsx}'],
    ...jsxA11yPlugin.flatConfigs.recommended,
  },
  
  // React hooks plugin - use flat config for ESLint 10 compatibility
  {
    ...reactHooksPlugin.configs.flat.recommended,
    files: ['**/*.{ts,tsx}'],
  },
  
  // React plugin - use flat configs for ESLint 10 compatibility
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,mts,cts}'],
    ...reactPlugin.configs.flat.recommended,
    settings: {
      react: {
        version: '19.2.4',
      },
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      'react/no-unknown-property': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
    },
  },
  
  // Base configuration for all files
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
);
