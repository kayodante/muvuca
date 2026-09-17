import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Só `.rules`, nunca o config object inteiro: `eslint-config-next` já
      // registra o plugin `jsx-a11y` (e liga 6 das 34 entradas), e espalhar
      // `jsxA11y.flatConfigs.recommended` traria a chave `plugins` de novo --
      // a flat config aborta com "Cannot redefine plugin jsx-a11y". As
      // implementações das regras vêm do registro do Next; esta linha decide
      // quais delas rodam.
      ...jsxA11y.flatConfigs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "supabase/.branches/**",
    "supabase/.temp/**",
    ".worktrees/**",
    ".agent/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    ".cursor/**",
    ".gemini/**",
  ]),
]);

export default eslintConfig;
