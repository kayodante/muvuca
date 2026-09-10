import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { reschedulePreviewsForItemsMock, refreshMock, routerMock, toast } =
  vi.hoisted(() => {
    const toastFn = Object.assign(vi.fn(), {
      success: vi.fn(),
      error: vi.fn(),
    });
    const refresh = vi.fn();
    return {
      reschedulePreviewsForItemsMock: vi.fn(),
      refreshMock: refresh,
      // `useRouter()` is stable across renders in the App Router; handing out
      // a fresh object per call would re-fire every effect that depends on it.
      routerMock: { refresh },
      toast: toastFn,
    };
  });

vi.mock("@/lib/actions/previews", () => ({
  reschedulePreviewsForItems: reschedulePreviewsForItemsMock,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));
vi.mock("sonner", () => ({ toast }));

import { usePreviewDrain } from "./usePreviewDrain";
import { notifyPreviewQueueChanged } from "@/lib/events/preview-queue";

/** The repo has no `@testing-library/react`; a minimal host component
 * driven by `createRoot` + `act` exercises the hook the same way the
 * component it lives in does. */
function Host({ ids }: { ids: string[] }) {
  const { refreshVisible, isDraining } = usePreviewDrain(ids);
  return (
    <button onClick={refreshVisible}>{isDraining ? "draining" : "idle"}</button>
  );
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let visibilitySpy: ReturnType<typeof vi.spyOn> | null = null;
let fetchMock: ReturnType<typeof vi.fn>;

const ONE_LINK = ["item-1"];

function setVisibility(state: DocumentVisibilityState) {
  visibilitySpy?.mockRestore();
  visibilitySpy = vi
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue(state);
}

/** A scoped-phase-shaped drain result: `processed`/`ready` non-zero so the
 * global phase's `processed === 0` guard is never accidentally tripped by
 * a test that isn't exercising it. */
function drainResult(remaining: number | null) {
  return { processed: 1, ready: 1, failed: 0, remaining };
}

function okResult(data: ReturnType<typeof drainResult>) {
  return { ok: true as const, data };
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function bodyOf(call: unknown[]) {
  const init = call[1] as RequestInit;
  return JSON.parse(init.body as string) as { itemIds?: string[] };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

async function mount(ids: string[]) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<Host ids={ids} />);
  });
}

async function rerender(ids: string[]) {
  await act(async () => {
    root?.render(<Host ids={ids} />);
  });
}

function hostButton() {
  return container?.querySelector("button") as HTMLButtonElement | null;
}

beforeEach(() => {
  setVisibility("visible");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  visibilitySpy?.mockRestore();
  visibilitySpy = null;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("usePreviewDrain — sessão automática (fase escopada)", () => {
  it("drena os ids da página, atualiza a rota, e segue para a fase global ao zerar", async () => {
    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(0))));
    await mount(ONE_LINK);

    // 1 rodada escopada + 1 rodada global (que também zera e para).
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodyOf(fetchMock.mock.calls[0]!)).toEqual({ itemIds: ONE_LINK });
    expect(bodyOf(fetchMock.mock.calls[1]!)).toEqual({});
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("não faz nenhuma chamada quando a página não tem item de link", async () => {
    await mount([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("repete enquanto remaining > 0, até o teto derivado do tamanho do escopo", async () => {
    // 13 ids -> ceil(13 / 6) + 1 = 4 rodadas. remaining nunca chega a 0, então
    // a fase global nunca começa.
    const ids = Array.from({ length: 13 }, (_, index) => `item-${index}`);
    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(5))));

    await mount(ids);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const call of fetchMock.mock.calls) {
      expect(bodyOf(call)).toEqual({ itemIds: ids });
    }
  });

  it("não chama a action quando a aba já está oculta", async () => {
    setVisibility("hidden");
    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(5))));

    await mount(ONE_LINK);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("para de chamar a action depois do unmount", async () => {
    const first = deferred<Response>();
    fetchMock.mockReturnValueOnce(first.promise);

    await mount(ONE_LINK);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => root?.unmount());
    root = null;

    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(5))));
    await act(async () => {
      first.resolve(jsonResponse(okResult(drainResult(5))));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retoma a drenagem quando a aba volta a ficar visível", async () => {
    setVisibility("hidden");
    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(5))));

    await mount(ONE_LINK);
    expect(fetchMock).not.toHaveBeenCalled();

    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      // Deixa os microtasks do laço de drenagem escoarem.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalled();
  });

  // Sem remount e sem reload -- a fila foi encontrada
  // vazia e o laço parou, mas um fluxo cliente (importação, edição de URL,
  // refresh por item) enfileirou trabalho novo depois.
  it("acorda de novo após notifyPreviewQueueChanged(), mesmo com a fila já encontrada vazia", async () => {
    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(0))));
    await mount(ONE_LINK);
    // 1 escopada + 1 global (ambas zeram de cara).
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      notifyPreviewQueueChanged();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Uma sessão nova repete o mesmo par (escopada + global).
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("inicia uma sessão nova quando o escopo da página muda", async () => {
    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(0))));
    await mount(ONE_LINK);
    expect(fetchMock).toHaveBeenCalledTimes(2); // escopada + global

    // Mesma lista, nova referência de array: não é uma troca de escopo.
    await rerender(["item-1"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await rerender(["item-2"]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const bodies = fetchMock.mock.calls.map(bodyOf);
    expect(bodies).toContainEqual({ itemIds: ["item-2"] });
  });

  it("para o laço quando a action falha, em vez de tentar para sempre", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: false,
        code: "UNKNOWN",
        message: "Não foi possível buscar jobs de preview.",
      }),
    );

    await mount(ONE_LINK);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("um fetch que rejeita encerra a sessão sem lançar", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await mount(ONE_LINK);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(hostButton()?.textContent).toBe("idle");
  });

  it("mantém isDraining quando a rodada da página anterior resolve depois da troca de escopo", async () => {
    const stale = deferred<Response>();
    const fresh = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(fresh.promise);
    // Cobre a rodada global que a sessão nova dispara ao zerar.
    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(0))));

    await mount(["item-1"]);
    await rerender(["item-2"]);
    expect(hostButton()?.textContent).toBe("draining");

    // A sessão cancelada resolve depois: o `finally` dela não pode limpar a
    // flag que a sessão nova (ainda em voo) é dona.
    await act(async () => {
      stale.resolve(jsonResponse(okResult(drainResult(0))));
    });
    expect(hostButton()?.textContent).toBe("draining");

    await act(async () => {
      fresh.resolve(jsonResponse(okResult(drainResult(0))));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(hostButton()?.textContent).toBe("idle");
  });

  it("expõe isDraining enquanto a sessão está em voo", async () => {
    const first = deferred<Response>();
    fetchMock.mockReturnValueOnce(first.promise);
    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(0))));

    await mount(ONE_LINK);
    expect(hostButton()?.textContent).toBe("draining");

    await act(async () => {
      first.resolve(jsonResponse(okResult(drainResult(0))));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hostButton()?.textContent).toBe("idle");
  });
});

describe("usePreviewDrain — fase global (backlog)", () => {
  it("libera isDraining ao entrar na fase global", async () => {
    const globalRound = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(0)))) // escopada -> zera
      .mockReturnValueOnce(globalRound.promise);

    await mount(ONE_LINK);

    // A varredura global ainda está em voo: é trabalho de fundo, e o botão
    // da toolbar não pode ficar preso em "Atualizando" por causa dela.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(hostButton()?.textContent).toBe("idle");

    await act(async () => {
      globalRound.resolve(jsonResponse(okResult(drainResult(0))));
    });
  });

  it("interrompe a varredura global quando um wake pede a fase escopada", async () => {
    const globalRound = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(0)))) // escopada -> zera
      .mockReturnValueOnce(globalRound.promise) // global rodada 1 (em voo)
      .mockResolvedValue(jsonResponse(okResult(drainResult(0))));

    await mount(ONE_LINK);
    expect(hostButton()?.textContent).toBe("idle");

    await act(async () => {
      notifyPreviewQueueChanged();
    });
    // O wake já marca a sessão como ocupada, mesmo antes de a rodada
    // global em voo terminar.
    expect(hostButton()?.textContent).toBe("draining");

    await act(async () => {
      globalRound.resolve(jsonResponse(okResult(drainResult(5))));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Rodada 2 da varredura global nunca acontece: a sessão nova recomeça
    // pela fase escopada.
    expect(bodyOf(fetchMock.mock.calls[2]!)).toEqual({ itemIds: ONE_LINK });
  });

  it("não chama router.refresh() na fase global", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(0)))) // escopada -> zera
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(5)))) // global rodada 1
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(0)))); // global rodada 2 -> zera

    await mount(ONE_LINK);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("para quando uma rodada global não reivindica nada (processed === 0)", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(0)))) // escopada -> zera
      .mockResolvedValueOnce(
        jsonResponse(
          okResult({ processed: 0, ready: 0, failed: 0, remaining: 5 }),
        ),
      );

    await mount(ONE_LINK);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("para quando remaining não diminui entre rodadas globais", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(0)))) // escopada -> zera
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(5)))) // global rodada 1
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(5)))); // rodada 2: não diminuiu

    await mount(ONE_LINK);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("para a fase global quando a aba fica oculta no meio de uma rodada", async () => {
    const round2 = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(0)))) // escopada -> zera
      .mockResolvedValueOnce(jsonResponse(okResult(drainResult(5)))) // global rodada 1
      .mockReturnValueOnce(round2.promise); // global rodada 2, ainda em voo

    await mount(ONE_LINK);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    setVisibility("hidden");
    await act(async () => {
      round2.resolve(jsonResponse(okResult(drainResult(3))));
      await Promise.resolve();
      await Promise.resolve();
    });

    // A rodada 2 (já em voo) termina, mas nenhuma rodada 3 é disparada.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("usePreviewDrain — refreshVisible", () => {
  beforeEach(() => {
    // A sessão automática de montagem encerra na primeira rodada; os casos
    // abaixo contam apenas o que o clique provoca.
    fetchMock.mockResolvedValue(jsonResponse(okResult(drainResult(0))));
  });

  it("reagenda o escopo da página e drena de novo", async () => {
    reschedulePreviewsForItemsMock.mockResolvedValue({
      ok: true,
      data: { rescheduled: 3 },
    });

    await mount(ONE_LINK);
    fetchMock.mockClear();

    await act(async () => {
      hostButton()?.click();
    });

    expect(reschedulePreviewsForItemsMock).toHaveBeenCalledWith(ONE_LINK);
    expect(toast.success).toHaveBeenCalledWith("3 prévias serão atualizadas.");
    expect(bodyOf(fetchMock.mock.calls[0]!)).toEqual({ itemIds: ONE_LINK });
  });

  it("não drena quando nada estava pendente", async () => {
    reschedulePreviewsForItemsMock.mockResolvedValue({
      ok: true,
      data: { rescheduled: 0 },
    });

    await mount(ONE_LINK);
    fetchMock.mockClear();

    await act(async () => {
      hostButton()?.click();
    });

    expect(toast).toHaveBeenCalledWith("Nenhuma prévia pendente nesta página.");
    expect(toast.success).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mostra um erro genérico quando a action lança, sem vazar o erro cru", async () => {
    reschedulePreviewsForItemsMock.mockRejectedValue(
      new Error("connect ECONNREFUSED 127.0.0.1:54321"),
    );

    await mount(ONE_LINK);
    fetchMock.mockClear();

    await act(async () => {
      hostButton()?.click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível atualizar as prévias.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(hostButton()?.textContent).toBe("idle");
  });

  it("mostra o erro da action e não drena quando o reagendamento falha", async () => {
    reschedulePreviewsForItemsMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Não foi possível atualizar as prévias.",
    });

    await mount(ONE_LINK);
    fetchMock.mockClear();

    await act(async () => {
      hostButton()?.click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível atualizar as prévias.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
