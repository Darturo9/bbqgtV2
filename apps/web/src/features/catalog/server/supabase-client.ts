import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@bbqbros/contracts";

import type { CatalogEnvironment } from "./catalog-environment";

export type CatalogSupabaseClient = SupabaseClient<Database>;

export function createCatalogSupabaseClient(
  environment: Pick<CatalogEnvironment, "supabaseUrl" | "supabasePublishableKey">,
): CatalogSupabaseClient {
  return createClient<Database>(environment.supabaseUrl, environment.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
