/**
 * ESLint flat config — enforces measurable parts of docs/clean-code.md
 * (file/function size hints, import layout, complexity proxies).
 */

import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      ".atp_safehouse/**",
      "**/*.config.js",
      "scripts/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
    },
    rules: {
      "import/no-unresolved": "off",
      "import/named": "off",
      "import/namespace": "off",
      "import/default": "off",
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off",

      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-require-imports": "off",

      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      /**
       * Optional stricter ordering (alphabetise + group newlines) is noisy with
       * `import type` + `.js` specifiers; `import/newline-after-import` covers
       * the clean-code “space after import block” goal.
       */
      "import/order": "off",

      /** clean-code.md: aim ~100–300 lines per file; warn beyond a practical ceiling. */
      "max-lines": [
        "warn",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      /** clean-code.md: prefer functions under ~50 lines; warn beyond a soft ceiling. */
      "max-lines-per-function": [
        "warn",
        {
          max: 220,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],

      complexity: ["warn", 22],
      "max-depth": ["warn", 5],

      "no-multiple-empty-lines": ["warn", { max: 2, maxEOF: 1, maxBOF: 0 }],
    },
  },
  {
    files: ["test/**/*.ts", "**/*.test.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      /** clean-code.md: ~400 lines ok for tests; split near ~800. */
      "max-lines": [
        "warn",
        { max: 850, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": "off",
      complexity: "off",
      "max-depth": "off",
    },
  }
);
