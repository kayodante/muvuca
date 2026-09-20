import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const dirname = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      ".worktrees/**",
      ".claude/worktrees/**",
      "e2e/**",
      "supabase/**",
    ],
    coverage: {
      // Ligado por padrão, não atrás de `--coverage`: o instrumento só vale
      // se o número aparecer em toda execução de `pnpm test`. O provider v8
      // é o mesmo motor do Node, sem custo de instrumentação Babel -- a
      // suíte inteira roda em ~26s com ou sem ele.
      enabled: true,
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      // `include` explícito, não o repo inteiro. Medir `components/**`
      // junto com `lib/**` mistura duas conversas e produz um número que
      // ninguém consegue acionar; a lista abaixo é onde um bug é silencioso
      // e caro -- trust boundary, os controles da ADR-015, o parser que
      // recebe arquivo de terceiro, a allowlist de sort/filter.
      include: [
        "lib/backup/**/*.{ts,tsx}",
        "lib/bookmarks/**/*.{ts,tsx}",
        "lib/code/**/*.{ts,tsx}",
        "lib/database/queries/**/*.{ts,tsx}",
        "lib/metadata/**/*.{ts,tsx}",
        "lib/security/**/*.{ts,tsx}",
        "lib/tags/**/*.{ts,tsx}",
        "lib/validation/**/*.{ts,tsx}",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/__tests__/**"],
      // Pisos medidos em 2026-09-19, não aspiracionais: cada um é a
      // cobertura real do módulo naquele dia, arredondada ~2 pontos para
      // baixo. Um threshold global de 80% inventado só produz um gate
      // vermelho que alguém desliga na semana seguinte; estes travam o que
      // já existe contra regressão e nada mais.
      //
      // Só `lines`. Um piso por métrica seriam 32 números para manter num
      // repo de um dev, e a contagem de branch do v8 oscila com mudança de
      // forma do código sem que a cobertura real mude. Subir qualquer um
      // destes pisos é trabalho separado.
      thresholds: {
        "lib/backup/**": { lines: 89 }, // medido 91.78
        "lib/bookmarks/**": { lines: 89 }, // medido 91.12
        "lib/code/**": { lines: 88 }, // medido 90.47
        "lib/database/queries/**": { lines: 78 }, // medido 80.95
        "lib/metadata/**": { lines: 96 }, // medido 98.39
        "lib/security/**": { lines: 94 }, // medido 96.15
        "lib/tags/**": { lines: 98 }, // medido 100
        "lib/validation/**": { lines: 96 }, // medido 98.97
      },
    },
  },
});
