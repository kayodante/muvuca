import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectionMock } = vi.hoisted(() => ({
  connectionMock: vi.fn(),
}));

vi.mock("next/server", () => ({
  connection: connectionMock,
}));

vi.mock("@/components/landing/LandingPage", () => ({
  LandingPage: () => <div data-testid="landing" />,
}));

vi.mock("@/lib/i18n/server", async () => ({
  getLocale: async () => "pt-BR",
  getDictionary: async () =>
    (await import("@/lib/i18n/dictionaries/pt-BR")).ptBR,
}));

import HomePage from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza a landing page para visitantes e usuários com sessão", async () => {
    const element = await HomePage();

    expect(connectionMock).toHaveBeenCalledTimes(1);
    expect(element).toBeDefined();
  });
});
