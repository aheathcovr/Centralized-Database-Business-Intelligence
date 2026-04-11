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
  
  // React hooks plugin
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
    },
    files: ['**/*.{ts,tsx}'],
  },
  
  // JSX a11y plugin
  {
    plugins: {
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...jsxA11yPlugin.configs.recommended.rules,
    },
    files: ['**/*.{ts,tsx}'],
  },
  
  // Import plugin
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {},
      },
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      'import/no-anonymous-default-export': 'warn',
    },
  },
  
  // React plugin
  {
    plugins: {
      react: reactPlugin,
    },
    settings: {
      react: {
        version: '19.2.4',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react/no-unknown-property': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
    },
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
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
    files: ['**/*.{js,jsx,ts,tsx,mjs,mts,cts}'],
  },
);
