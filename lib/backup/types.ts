/**
 * Limites da restauração de backup JSON. Os valores espelham
 * lib/bookmarks/types.ts de propósito: o teto real é o guard dentro da RPC
 * public.import_library_backup, e os dois caminhos de importação devem
 * falhar no mesmo ponto.
 *
 * A restauração inteira é enviada numa única chamada: lotes com chamadas
 * separadas quebrariam a atomicidade -- ver import_library_backup. Por
 * isso não há um limite "por lote" distinto do limite do arquivo inteiro.
 */
export const MAX_BACKUP_FILE_SIZE = 10_000_000;
export const MAX_BACKUP_TAGS = 5_000;
export const MAX_BACKUP_ITEMS = 20_000;

export type BackupTagPayload = {
  key: string;
  parentKey: string | null;
  name: string;
  colorToken: string;
  /** Ausente em arquivo 1.0; a RPC não sobrescreve tag existente de qualquer forma. */
  description: string | null;
  /** Ausente em arquivo 1.0; a RPC usa `now()` quando nulo (só em tag nova). */
  createdAt: string | null;
};

export type BackupItemPayload = {
  type: "link" | "prompt" | "code_component";
  title: string;
  url: string | null;
  content: string | null;
  description: string | null;
  createdAt: string;
  tagKeys: string[];
};

/** Payload de fio enviado numa única chamada à Server Action. */
export type BackupPayload = {
  tags: BackupTagPayload[];
  items: BackupItemPayload[];
};
