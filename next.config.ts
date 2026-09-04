import type { NextConfig } from "next";
import { baselineSecurityHeaders } from "./lib/security/headers";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Standalone output bundles only the production dependency subset a
  // request actually needs into .next/standalone -- only the Docker image
  // (Dockerfile) needs that; `next start` refuses to run against it
  // ("next start does not work with output: standalone"). BUILD_STANDALONE
  // is set by the Dockerfile's build stage, never by `pnpm build` on its
  // own, so the plain `pnpm build && pnpm start` flow keeps the default
  // output and stays startable.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // NEXT_PUBLIC_APP_URL (and the Supabase auth redirect allowlist) use
  // 127.0.0.1, not localhost -- without this, Turbopack's dev HMR socket is
  // blocked as cross-origin and the client bundle never finishes booting,
  // silently leaving every interactive element unresponsive in dev.
  allowedDevOrigins: isProduction ? undefined : ["127.0.0.1"],
  experimental: {
    serverActions: {
      // Necessário só para a restauração de backup: MAX_BACKUP_FILE_SIZE
      // (lib/backup/types.ts) limita o arquivo a 10MB, e a restauração
      // inteira vai numa única chamada de Server Action -- fatiar em várias
      // chamadas quebraria a atomicidade da RPC (cada chamada teria sua
      // própria transação). O teto fica com folga acima do arquivo.
      //
      // `bodySizeLimit` é uma configuração única por aplicação no Next.js
      // 16 -- não há como escopar por Server Action individual. A alternativa
      // seria mover a restauração para um Route Handler com seu próprio
      // limite, mas Route Handlers não ganham a proteção CSRF automática que
      // Server Actions têm (id de ação criptografado + checagem de Origin);
      // reimplementar isso à mão pesaria mais em segurança do que o ganho de
      // escopar o limite. Nenhuma outra Server Action do projeto se aproxima
      // de 1MB de payload, então o custo real é permitir requisições maiores
      // (não payloads processados sem validação) às demais ações.
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: baselineSecurityHeaders(isProduction),
      },
    ];
  },
};

export default nextConfig;
