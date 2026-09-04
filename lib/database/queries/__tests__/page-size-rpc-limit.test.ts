import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, rpcMock } = vi.hoisted(() => {
  const rpc = vi.fn();
  return {
    rpcMock: rpc,
    createClientMock: vi.fn().mockResolvedValue({ rpc }),
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { getLibraryItems, PAGE_SIZE } from "@/lib/database/queries/items";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

/**
 * Lê o teto declarado na migration mais recente de search_library.
 * O RPC é a fonte de verdade do limite; este teste só espelha o valor.
 */
function readRpcMaxLimit(): number {
  const migration = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql") && name.includes("search_library"))
    .sort()
    .at(-1);

  expect(
    migration,
    "nenhuma migration de search_library encontrada",
  ).toBeDefined();

  const sql = readFileSync(path.join(MIGRATIONS_DIR, migration!), "utf8");
  const match = sql.match(
    /v_max_limit\s+constant\s+int\s*:=\s*(\d+)\s*;\s*--\s*SEARCH_LIBRARY_MAX_LIMIT/,
  );

  expect(
    match,
    "marcador SEARCH_LIBRARY_MAX_LIMIT ausente na migration de search_library",
  ).not.toBeNull();

  return Number(match![1]);
}

describe("contrato entre PAGE_SIZE e o teto de search_library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mantém PAGE_SIZE + 1 dentro do teto declarado no RPC", () => {
    expect(PAGE_SIZE + 1).toBeLessThanOrEqual(readRpcMaxLimit());
  });

  it("pede ao RPC exatamente PAGE_SIZE + 1 linhas", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await getLibraryItems();

    expect(rpcMock).toHaveBeenCalledWith(
      "search_library",
      expect.objectContaining({ p_limit: PAGE_SIZE + 1 }),
    );
  });
});
