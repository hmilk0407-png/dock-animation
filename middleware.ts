import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /* 静的アセット・画像以外のすべてのパスで認証を確認 */
    "/((?!_next/static|_next/image|favicon.ico|avatars/|test|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
};
