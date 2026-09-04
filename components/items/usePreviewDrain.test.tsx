import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  drainPreviewQueueMock,
  reschedulePreviewsForItemsMock,
  refreshMock,
  routerMock,
  toast,
} = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  });
  const refresh = vi.fn();
  return {
    drainPreviewQueueMock: vi.fn(),
    reschedulePreviewsForItemsMock: vi.fn(),
    refreshMock: refresh,
    // `useRouter()` is stable across renders in the App Router; handing out
    // a fresh object per call would re-fire every effect that depends on it.
    routerMock: { refresh },
    toast: toastFn,
  };
});

vi.mock("@/lib/actions/previews", () => ({
  drainPreviewQueue: drainPreviewQueueMock,
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

const ONE_LINK = ["item-1"];

function setVisibility(state: DocumentVisibilityState) {
  visibilitySpy?.mockRestore();
  visibilitySpy = vi
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue(state);
}

function drainResult(remaining: number) {
  return {
    ok: true as const,
    data: { processed: 1, ready: 1, failed: 0, remaining },
  };
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
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  visibilitySpy?.mockRestore();
  visibilitySpy = null;
  vi.clearAllMocks();
});

describe("usePreviewDrain — sessão automática", () => {
  it("drena apenas os ids da página e para quando remaining chega a 0, atualizando a rota", async () => {
    drainPreviewQueueMock.mockResolvedValue(drainResult(0));
    await mount(ONE_LINK);

    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(1);
    expect(drainPreviewQueueMock).toHaveBeenCalledWith({ itemIds: ONE_LINK });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("não faz nenhuma chamada quando a página não tem item de link", async () => {
    drainPreviewQueueMock.mockResolvedValue(drainResult(5));
    await mount([]);

    expect(drainPreviewQueueMock).not.toHaveBeenCalled();
  });

  it("repete enquanto remaining > 0, até o teto derivado do tamanho do escopo", async () => {
    // 13 ids -> ceil(13 / 6) + 1 = 4 rodadas.
    const ids = Array.from({ length: 13 }, (_, index) => `item-${index}`);
    drainPreviewQueueMock.mockResolvedValue(drainResult(5));

    await mount(ids);

    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(4);
    for (const call of drainPreviewQueueMock.mock.calls) {
      expect(call[0]).toEqual({ itemIds: ids });
    }
  });

  it("não chama a action quando a aba já está oculta", async () => {
    setVisibility("hidden");
    drainPreviewQueueMock.mockResolvedValue(drainResult(5));

    await mount(ONE_LINK);

    expect(drainPreviewQueueMock).not.toHaveBeenCalled();
  });

  it("para de chamar a action depois do unmount", async () => {
    const first = deferred<ReturnType<typeof drainResult>>();
    drainPreviewQueueMock.mockReturnValueOnce(first.promise);

    await mount(ONE_LINK);
    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(1);

    await act(async () => root?.unmount());
    root = null;

    drainPreviewQueueMock.mockResolvedValue(drainResult(5));
    await act(async () => {
      first.resolve(drainResult(5));
    });

    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(1);
  });

  it("retoma a drenagem quando a aba volta a ficar visível", async () => {
    setVisibility("hidden");
    drainPreviewQueueMock.mockResolvedValue(drainResult(5));

    await mount(ONE_LINK);
    expect(drainPreviewQueueMock).not.toHaveBeenCalled();

    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      // Deixa os microtasks do laço de drenagem escoarem.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(drainPreviewQueueMock).toHaveBeenCalled();
  });

  // Sem remount e sem reload -- a fila foi encontrada
  // vazia e o laço parou, mas um fluxo cliente (importação, edição de URL,
  // refresh por item) enfileirou trabalho novo depois.
  it("acorda de novo após notifyPreviewQueueChanged(), mesmo com a fila já encontrada vazia", async () => {
    drainPreviewQueueMock.mockResolvedValue(drainResult(0));
    await mount(ONE_LINK);
    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      notifyPreviewQueueChanged();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(2);
  });

  it("inicia uma sessão nova quando o escopo da página muda", async () => {
    drainPreviewQueueMock.mockResolvedValue(drainResult(0));
    await mount(ONE_LINK);
    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(1);

    // Mesma lista, nova referência de array: não é uma troca de escopo.
    await rerender(["item-1"]);
    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(1);

    await rerender(["item-2"]);
    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(2);
    expect(drainPreviewQueueMock).toHaveBeenLastCalledWith({
      itemIds: ["item-2"],
    });
  });

  it("para o laço quando a action falha, em vez de tentar para sempre", async () => {
    drainPreviewQueueMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Não foi possível buscar jobs de preview.",
    });

    await mount(ONE_LINK);

    expect(drainPreviewQueueMock).toHaveBeenCalledTimes(1);
  });

  it("mantém isDraining quando a rodada da página anterior resolve depois da troca de escopo", async () => {
    const stale = deferred<ReturnType<typeof drainResult>>();
    const fresh = deferred<ReturnType<typeof drainResult>>();
    drainPreviewQueueMock
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(fresh.promise);

    await mount(["item-1"]);
    await rerender(["item-2"]);
    expect(hostButton()?.textContent).toBe("draining");

    // A sessão cancelada resolve depois: o `finally` dela não pode limpar a
    // flag que a sessão nova (ainda em voo) é dona.
    await act(async () => {
      stale.resolve(drainResult(0));
    });
    expect(hostButton()?.textContent).toBe("draining");

    await act(async () => {
      fresh.resolve(drainResult(0));
    });
    expect(hostButton()?.textContent).toBe("idle");
  });

  it("expõe isDraining enquanto a sessão está em voo", async () => {
    const first = deferred<ReturnType<typeof drainResult>>();
    drainPreviewQueueMock.mockReturnValueOnce(first.promise);

    await mount(ONE_LINK);
    expect(hostButton()?.textContent).toBe("draining");

    await act(async () => {
      first.resolve(drainResult(0));
    });

    expect(hostButton()?.textContent).toBe("idle");
  });
});

describe("usePreviewDrain — refreshVisible", () => {
  beforeEach(() => {
    // A sessão automática de montagem encerra na primeira rodada; os casos
    // abaixo contam apenas o que o clique provoca.
    drainPreviewQueueMock.mockResolvedValue(drainResult(0));
  });

  it("reagenda o escopo da página e drena de novo", async () => {
    reschedulePreviewsForItemsMock.mockResolvedValue({
      ok: true,
      data: { rescheduled: 3 },
    });

    await mount(ONE_LINK);
    drainPreviewQueueMock.mockClear();

    await act(async () => {
      hostButton()?.click();
    });

    expect(reschedulePreviewsForItemsMock).toHaveBeenCalledWith(ONE_LINK);
    expect(toast.success).toHaveBeenCalledWith("3 prévias serão atualizadas.");
    expect(drainPreviewQueueMock).toHaveBeenCalledWith({ itemIds: ONE_LINK });
  });

  it("não drena quando nada estava pendente", async () => {
    reschedulePreviewsForItemsMock.mockResolvedValue({
      ok: true,
      data: { rescheduled: 0 },
    });

    await mount(ONE_LINK);
    drainPreviewQueueMock.mockClear();

    await act(async () => {
      hostButton()?.click();
    });

    expect(toast).toHaveBeenCalledWith("Nenhuma prévia pendente nesta página.");
    expect(toast.success).not.toHaveBeenCalled();
    expect(drainPreviewQueueMock).not.toHaveBeenCalled();
  });

  it("mostra um erro genérico quando a action lança, sem vazar o erro cru", async () => {
    reschedulePreviewsForItemsMock.mockRejectedValue(
      new Error("connect ECONNREFUSED 127.0.0.1:54321"),
    );

    await mount(ONE_LINK);
    drainPreviewQueueMock.mockClear();

    await act(async () => {
      hostButton()?.click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível atualizar as prévias.",
    );
    expect(drainPreviewQueueMock).not.toHaveBeenCalled();
    expect(hostButton()?.textContent).toBe("idle");
  });

  it("mostra o erro da action e não drena quando o reagendamento falha", async () => {
    reschedulePreviewsForItemsMock.mockResolvedValue({
      ok: false,
      code: "UNKNOWN",
      message: "Não foi possível atualizar as prévias.",
    });

    await mount(ONE_LINK);
    drainPreviewQueueMock.mockClear();

    await act(async () => {
      hostButton()?.click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível atualizar as prévias.",
    );
    expect(drainPreviewQueueMock).not.toHaveBeenCalled();
  });
});
