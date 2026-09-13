import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(() => ({ kind: "catalog-supabase-client" })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

import { createCatalogSupabaseClient } from "./supabase-client";

describe("createCatalogSupabaseClient", () => {
  beforeEach(() => {
    createClientMock.mockClear();
  });

  it("crea un cliente tipado sin estado de autenticación persistente", () => {
    const client = createCatalogSupabaseClient({
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "sb_publishable_local-test-value",
    });

    expect(client).toEqual({ kind: "catalog-supabase-client" });
    expect(createClientMock).toHaveBeenCalledOnce();
    expect(createClientMock).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "sb_publishable_local-test-value",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });
});
