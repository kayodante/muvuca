import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  requireUserMock,
  revalidatePathMock,
  logEventMock,
  rpcMock,
  fromMock,
  getLibraryItemByIdMock,
  afterMock,
  drainPreviewQueueMock,
  deletePreviewObjectsMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  requireUserMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  logEventMock: vi.fn(),
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  getLibraryItemByIdMock: vi.fn(),
  afterMock: vi.fn(),
  drainPreviewQueueMock: vi.fn(),
  deletePreviewObjectsMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/server", () => ({
  after: afterMock,
}));

vi.mock("@/lib/security/logging", () => ({
  logEvent: logEventMock,
}));

vi.mock("@/lib/database/queries/items", () => ({
  getLibraryItemById: getLibraryItemByIdMock,
}));

vi.mock("@/lib/previews/drain", () => ({
  drainPreviewQueue: drainPreviewQueueMock,
}));

vi.mock("@/lib/storage/previews", () => ({
  deletePreviewObjects: deletePreviewObjectsMock,
}));

import { createItem, deleteItem, getItemDetails, updateItem } from "./items";

describe("items actions", () => {
  const dummyUser = {
    id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    email: "user@muvuca.test",
  };
  const validItemId = "123e4567-e89b-12d3-a456-426614174000";
  const validTagId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue(dummyUser);
    createClientMock.mockResolvedValue({
      rpc: rpcMock,
      from: fromMock,
    });
    // mockClear() (via clearAllMocks) doesn't reset implementations, so a
    // deleteItem test that doesn't care about Storage cleanup isn't
    // accidentally poisoned by an earlier test's mockRejectedValue.
    deletePreviewObjectsMock.mockResolvedValue(undefined);
  });

  describe("createItem", () => {
    it("creates a link item successfully", async () => {
      rpcMock.mockResolvedValue({ data: validItemId, error: null });

      const formData = new FormData();
      formData.set("type", "link");
      formData.set("title", "My Link");
      formData.set("url", "https://example.com/docs");
      formData.set("description", "A helpful doc");
      formData.append("tagIds", validTagId);

      const result = await createItem(null, formData);

      expect(result).toEqual({ ok: true, data: { id: validItemId } });
      expect(rpcMock).toHaveBeenCalledWith("create_library_item", {
        p_type: "link",
        p_title: "My Link",
        p_url: "https://example.com/docs",
        p_normalized_url: "https://example.com/docs",
        p_content: null,
        p_description: "A helpful doc",
        p_tag_ids: [validTagId],
      });
      expect(revalidatePathMock).toHaveBeenCalledWith("/library");
      expect(revalidatePathMock).toHaveBeenCalledWith("/tags", "layout");
    });

    it("creates a prompt item successfully", async () => {
      rpcMock.mockResolvedValue({ data: validItemId, error: null });

      const formData = new FormData();
      formData.set("type", "prompt");
      formData.set("title", "Code Review Prompt");
      formData.set("content", "Review this code for vulnerabilities.");
      formData.set("description", "Prompt for LLMs");

      const result = await createItem(null, formData);

      expect(result).toEqual({ ok: true, data: { id: validItemId } });
      expect(rpcMock).toHaveBeenCalledWith("create_library_item", {
        p_type: "prompt",
        p_title: "Code Review Prompt",
        p_url: null,
        p_normalized_url: null,
        p_content: "Review this code for vulnerabilities.",
        p_description: "Prompt for LLMs",
        p_tag_ids: [],
      });
    });

    it("creates a code_component item with URL successfully", async () => {
      rpcMock.mockResolvedValue({ data: validItemId, error: null });

      const formData = new FormData();
      formData.set("type", "code_component");
      formData.set("title", "Button Component");
      formData.set(
        "content",
        "export function Button() { return <button />; }",
      );
      formData.set("url", "https://ui.shadcn.com/docs/components/button");
      formData.set("description", "Shadcn button");
      formData.append("tagIds", validTagId);

      const result = await createItem(null, formData);

      expect(result).toEqual({ ok: true, data: { id: validItemId } });
      expect(rpcMock).toHaveBeenCalledWith("create_library_item", {
        p_type: "code_component",
        p_title: "Button Component",
        p_url: "https://ui.shadcn.com/docs/components/button",
        p_normalized_url: "https://ui.shadcn.com/docs/components/button",
        p_content: "export function Button() { return <button />; }",
        p_description: "Shadcn button",
        p_tag_ids: [validTagId],
      });
      expect(revalidatePathMock).toHaveBeenCalledWith("/library");
      expect(revalidatePathMock).toHaveBeenCalledWith("/tags", "layout");
    });

    it("creates a code_component item without URL (empty string) successfully", async () => {
      rpcMock.mockResolvedValue({ data: validItemId, error: null });

      const formData = new FormData();
      formData.set("type", "code_component");
      formData.set("title", "Custom Hook");
      formData.set("content", "export function useCounter() { return 0; }");
      formData.set("url", "");
      formData.set("description", "");

      const result = await createItem(null, formData);

      expect(result).toEqual({ ok: true, data: { id: validItemId } });
      expect(rpcMock).toHaveBeenCalledWith("create_library_item", {
        p_type: "code_component",
        p_title: "Custom Hook",
        p_url: null,
        p_normalized_url: null,
        p_content: "export function useCounter() { return 0; }",
        p_description: null,
        p_tag_ids: [],
      });
    });

    it("rejects code_component with invalid URL", async () => {
      const formData = new FormData();
      formData.set("type", "code_component");
      formData.set("title", "Button Component");
      formData.set("content", "export function Button() {}");
      formData.set("url", "javascript:alert(1)");

      const result = await createItem(null, formData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_FAILED");
      }
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("rejects code_component without content", async () => {
      const formData = new FormData();
      formData.set("type", "code_component");
      formData.set("title", "Button Component");
      formData.set("content", "   ");

      const result = await createItem(null, formData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_FAILED");
      }
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("maps database errors correctly on creation failure", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key" },
      });

      const formData = new FormData();
      formData.set("type", "link");
      formData.set("title", "Duplicate Link");
      formData.set("url", "https://example.com");

      const result = await createItem(null, formData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("DUPLICATE");
        expect(result.message).toBe("Esse link já está na sua biblioteca.");
      }
      expect(logEventMock).toHaveBeenCalledWith({
        event: "item.create_failed",
        status: "failure",
        errorClass: "23505",
        userId: dummyUser.id,
      });
    });

    // Anchor test: creating a link must never depend
    // on metadata enrichment succeeding -- not even when the network is
    // down. drainPreviewQueue only ever runs inside after(), scheduled
    // after createItem has already returned `ok`, and its own rejection
    // must never surface back to the caller.
    it("returns ok for a link even when the after() preview drain rejects", async () => {
      rpcMock.mockResolvedValue({ data: validItemId, error: null });
      drainPreviewQueueMock.mockRejectedValue(new Error("network down"));

      const formData = new FormData();
      formData.set("type", "link");
      formData.set("title", "My Link");
      formData.set("url", "https://example.com/docs");

      const result = await createItem(null, formData);

      expect(result).toEqual({ ok: true, data: { id: validItemId } });
      expect(afterMock).toHaveBeenCalledTimes(1);

      const afterCallback = afterMock.mock.calls[0]?.[0] as () => Promise<void>;
      let threw = false;
      try {
        await afterCallback();
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
      expect(drainPreviewQueueMock).toHaveBeenCalledWith({ limit: 1 });
    });

    it("does not schedule an after() preview drain for a prompt item", async () => {
      rpcMock.mockResolvedValue({ data: validItemId, error: null });

      const formData = new FormData();
      formData.set("type", "prompt");
      formData.set("title", "A Prompt");
      formData.set("content", "Do something useful.");

      await createItem(null, formData);

      expect(afterMock).not.toHaveBeenCalled();
      expect(drainPreviewQueueMock).not.toHaveBeenCalled();
    });

    it("does not schedule an after() preview drain for a code_component item", async () => {
      rpcMock.mockResolvedValue({ data: validItemId, error: null });

      const formData = new FormData();
      formData.set("type", "code_component");
      formData.set("title", "A Snippet");
      formData.set("content", "export const x = 1;");

      await createItem(null, formData);

      expect(afterMock).not.toHaveBeenCalled();
      expect(drainPreviewQueueMock).not.toHaveBeenCalled();
    });
  });

  describe("updateItem", () => {
    it("updates a code_component item with URL successfully", async () => {
      rpcMock.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("id", validItemId);
      formData.set("type", "code_component");
      formData.set("title", "Updated Button");
      formData.set(
        "content",
        "export function Button() { return <button className='btn' />; }",
      );
      formData.set("url", "https://example.com/button");
      formData.set("description", "Updated description");
      formData.append("tagIds", validTagId);

      const result = await updateItem(null, formData);

      expect(result).toEqual({ ok: true, data: null });
      expect(rpcMock).toHaveBeenCalledWith("update_library_item", {
        p_item_id: validItemId,
        p_type: "code_component",
        p_title: "Updated Button",
        p_url: "https://example.com/button",
        p_normalized_url: "https://example.com/button",
        p_content:
          "export function Button() { return <button className='btn' />; }",
        p_description: "Updated description",
        p_tag_ids: [validTagId],
      });
      expect(revalidatePathMock).toHaveBeenCalledWith("/library");
      expect(revalidatePathMock).toHaveBeenCalledWith("/tags", "layout");
    });

    it("updates a code_component item without URL successfully", async () => {
      rpcMock.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("id", validItemId);
      formData.set("type", "code_component");
      formData.set("title", "Updated Hook");
      formData.set("content", "export function useHook() {}");
      formData.set("url", "");
      formData.set("description", "");

      const result = await updateItem(null, formData);

      expect(result).toEqual({ ok: true, data: null });
      expect(rpcMock).toHaveBeenCalledWith("update_library_item", {
        p_item_id: validItemId,
        p_type: "code_component",
        p_title: "Updated Hook",
        p_url: null,
        p_normalized_url: null,
        p_content: "export function useHook() {}",
        p_description: null,
        p_tag_ids: [],
      });
    });

    it("rejects update with invalid URL for code_component", async () => {
      const formData = new FormData();
      formData.set("id", validItemId);
      formData.set("type", "code_component");
      formData.set("title", "Button Component");
      formData.set("content", "export function Button() {}");
      formData.set("url", "ftp://invalid-scheme.com");

      const result = await updateItem(null, formData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_FAILED");
      }
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("returns NOT_FOUND when update RPC returns P0001", async () => {
      rpcMock.mockResolvedValue({
        error: { code: "P0001", message: "Item não encontrado" },
      });

      const formData = new FormData();
      formData.set("id", validItemId);
      formData.set("type", "code_component");
      formData.set("title", "Button Component");
      formData.set("content", "export function Button() {}");

      const result = await updateItem(null, formData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("NOT_FOUND");
        expect(result.message).toBe("Item ou tags não estão disponíveis.");
      }
      expect(logEventMock).toHaveBeenCalledWith({
        event: "item.update_failed",
        status: "failure",
        errorClass: "P0001",
        userId: dummyUser.id,
        entityId: validItemId,
      });
    });
  });

  describe("getItemDetails", () => {
    it("returns code_component details when item exists", async () => {
      const codeItem = {
        id: validItemId,
        type: "code_component" as const,
        title: "Button Component",
        description: "A button",
        url: "https://example.com/button",
        content: "export function Button() {}",
        tagIds: [validTagId],
      };
      getLibraryItemByIdMock.mockResolvedValue(codeItem);

      const result = await getItemDetails(validItemId);

      expect(result).toEqual({ ok: true, data: codeItem });
      expect(getLibraryItemByIdMock).toHaveBeenCalledWith(validItemId);
    });

    it("returns NOT_FOUND when item does not exist", async () => {
      getLibraryItemByIdMock.mockResolvedValue(null);

      const result = await getItemDetails(validItemId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("NOT_FOUND");
        expect(result.message).toBe("Item não encontrado.");
      }
    });

    it("returns VALIDATION_FAILED for invalid UUID", async () => {
      const result = await getItemDetails("not-a-uuid");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_FAILED");
        expect(result.message).toBe("Item inválido.");
      }
      expect(getLibraryItemByIdMock).not.toHaveBeenCalled();
    });

    it("handles database query failure and logs event", async () => {
      getLibraryItemByIdMock.mockRejectedValue(
        new Error("DB connection error"),
      );

      const result = await getItemDetails(validItemId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("UNKNOWN");
        expect(result.message).toBe("Não foi possível carregar o item.");
      }
      expect(logEventMock).toHaveBeenCalledWith({
        event: "item.detail_failed",
        status: "failure",
        errorClass: "Error",
        userId: dummyUser.id,
        entityId: validItemId,
      });
    });
  });

  describe("deleteItem", () => {
    it("deletes an item successfully", async () => {
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { id: validItemId }, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const deleteFn = vi.fn().mockReturnValue({ eq });
      fromMock.mockReturnValue({ delete: deleteFn });

      const formData = new FormData();
      formData.set("id", validItemId);

      const result = await deleteItem(null, formData);

      expect(result).toEqual({ ok: true, data: null });
      expect(revalidatePathMock).toHaveBeenCalledWith("/library");
      expect(revalidatePathMock).toHaveBeenCalledWith("/tags", "layout");
    });

    it("returns NOT_FOUND if item was not found on delete", async () => {
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const deleteFn = vi.fn().mockReturnValue({ eq });
      fromMock.mockReturnValue({ delete: deleteFn });

      const formData = new FormData();
      formData.set("id", validItemId);

      const result = await deleteItem(null, formData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("NOT_FOUND");
        expect(result.message).toBe("Item não encontrado.");
      }
    });

    // Deleting an item must leave no object in the Storage bucket.
    // deletePreviewObjects() is called with the owning user's own
    // id before the row delete, so a bucket cleanup failure can never leave
    // the row delete half-done.
    it("limpa os objetos de preview do Storage antes de deletar a linha", async () => {
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { id: validItemId }, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const deleteFn = vi.fn().mockReturnValue({ eq });
      fromMock.mockReturnValue({ delete: deleteFn });

      const formData = new FormData();
      formData.set("id", validItemId);

      const result = await deleteItem(null, formData);

      expect(result).toEqual({ ok: true, data: null });
      expect(deletePreviewObjectsMock).toHaveBeenCalledWith(
        expect.anything(),
        dummyUser.id,
        validItemId,
      );
      // Order matters: cleanup must run before the row is deleted, not after.
      expect(deletePreviewObjectsMock.mock.invocationCallOrder[0]).toBeLessThan(
        deleteFn.mock.invocationCallOrder[0]!,
      );
    });

    it("retorna ok mesmo quando a limpeza do Storage falha (best-effort)", async () => {
      deletePreviewObjectsMock.mockRejectedValue(new Error("storage down"));
      const maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { id: validItemId }, error: null });
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const deleteFn = vi.fn().mockReturnValue({ eq });
      fromMock.mockReturnValue({ delete: deleteFn });

      const formData = new FormData();
      formData.set("id", validItemId);

      const result = await deleteItem(null, formData);

      expect(result).toEqual({ ok: true, data: null });
      expect(deleteFn).toHaveBeenCalled();
      expect(logEventMock).toHaveBeenCalledWith({
        event: "preview.cleanup_failed",
        status: "failure",
        errorClass: "Error",
        entityId: validItemId,
        userId: dummyUser.id,
      });
    });
  });
});
