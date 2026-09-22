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
      // O toast tem um caminho só: `components/states/Toast.tsx`. A regra
      // existe porque sem ela o wrapper não se sustenta -- foi exatamente
      // assim que 22 arquivos passaram a importar `sonner` direto enquanto
      // o wrapper ficava sem nenhum consumidor de produção (AAA-214).
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "sonner",
              message:
                "Use toastSuccess/toastError/toastInfo de @/components/states/Toast.",
            },
          ],
        },
      ],
    },
  },
  {
    // Os dois donos legítimos do import: o wrapper e a montagem do
    // `<Toaster />`. Testes precisam do módulo real para `vi.mock` e para
    // limpar toasts pendentes entre casos.
    files: [
      "components/states/Toast.tsx",
      "components/ui/sonner.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.stories.tsx",
    ],
    rules: { "no-restricted-imports": "off" },
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
