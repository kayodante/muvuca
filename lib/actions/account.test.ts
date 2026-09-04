import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserMock,
  createClientMock,
  rpcMock,
  revalidatePathMock,
  logEventMock,
  removeAllUserPreviewObjectsMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  createClientMock: vi.fn(),
  rpcMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  logEventMock: vi.fn(),
  removeAllUserPreviewObjectsMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/security/logging", () => ({ logEvent: logEventMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/storage/previews", () => ({
  removeAllUserPreviewObjects: removeAllUserPreviewObjectsMock,
}));

import { resetAccount } from "./account";

describe("resetAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-123" });
    removeAllUserPreviewObjectsMock.mockResolvedValue(undefined);
    createClientMock.mockResolvedValue({ rpc: rpcMock });
  });

  it("exige sessão antes de chamar a RPC", async () => {
    rpcMock.mockResolvedValue({ error: null });

    await resetAccount();

    expect(requireUserMock).toHaveBeenCalled();
  });

  it("chama reset_account sem argumentos e revalida as rotas afetadas", async () => {
    rpcMock.mockResolvedValue({ error: null });

    const result = await resetAccount();

    expect(rpcMock).toHaveBeenCalledWith("reset_account");
    expect(result.ok).toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/library");
    expect(revalidatePathMock).toHaveBeenCalledWith("/tags", "layout");
    expect(revalidatePathMock).toHaveBeenCalledWith("/settings");
  });

  it("devolve erro genérico sem vazar detalhe interno quando a RPC falha", async () => {
    rpcMock.mockResolvedValue({ error: { code: "XXYYY" } });

    const result = await resetAccount();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNKNOWN");
      expect(result.message).toBe("Não foi possível apagar os dados da conta.");
    }
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  // Resetting the account must also clean the user's Storage folder --
  // delegated to removeAllUserPreviewObjects (own pagination test coverage
  // lives in lib/storage/previews.test.ts).
  it("limpa os objetos de preview do usuário antes de resetar a conta", async () => {
    rpcMock.mockResolvedValue({ error: null });

    const result = await resetAccount();

    expect(result.ok).toBe(true);
    expect(removeAllUserPreviewObjectsMock).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
    );
    expect(rpcMock).toHaveBeenCalledWith("reset_account");
  });

  it("retorna ok mesmo quando a limpeza do Storage falha (best-effort)", async () => {
    removeAllUserPreviewObjectsMock.mockRejectedValue(new Error("nope"));
    rpcMock.mockResolvedValue({ error: null });

    const result = await resetAccount();

    expect(result.ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith("reset_account");
    expect(logEventMock).toHaveBeenCalledWith({
      event: "preview.cleanup_failed",
      status: "failure",
      errorClass: expect.any(String),
      userId: "user-123",
    });
  });
});
