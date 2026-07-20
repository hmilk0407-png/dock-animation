import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* マジックリンク / OAuth のコールバック: コードをセッションに交換して "/" へ */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/`);
}
