// ESLint config para navegador
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["public/**", "node_modules/**", "dist/**", "build/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        fbq: "readonly",
        gtag: "readonly",
      },
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      "no-empty": "off",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      "no-console": "off",
    },
  },
];
