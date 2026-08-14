import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/indent": ["error", 2, { SwitchCase: 1 }],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/keyword-spacing": ["error", {
        before: true,
        after: true,
        overrides: {
          const: { before: true, after: true },
          let: { before: true, after: true },
          var: { before: true, after: true },
        },
      }],
      "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 0, maxBOF: 0 }],
    },
  },
  {
    ignores: ["dist/", "node_modules/", "*.config.js"],
  },
);
