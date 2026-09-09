/* ---------- サーバー専用: service role クライアント ----------
   RLS をバイパスする強い鍵。Route Handler 内でのみ使い、
   クライアントへは絶対に渡さない。 */
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function hasAdminClient(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY が設定されていません");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
