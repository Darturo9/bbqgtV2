import type { NextConfig } from "next";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const CATALOG_IMAGE_PATH = "/storage/v1/object/public/catalog/**";

function readSupabaseOrigin(): URL {
  const value = process.env.SUPABASE_URL ?? LOCAL_SUPABASE_URL;
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS origin during the build.");
  }

  if (
    value.trim() !== value ||
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS origin during the build.");
  }

  return url;
}

const supabaseOrigin = readSupabaseOrigin();
const catalogImagePattern = new URL(CATALOG_IMAGE_PATH, supabaseOrigin);

const nextConfig: NextConfig = {
  agentRules: false,
  cacheComponents: true,
  cacheLife: {
    catalog: {
      stale: 60,
      revalidate: 60,
      expire: 120,
    },
  },
  images: {
    remotePatterns: [catalogImagePattern],
  },
};

export default nextConfig;
