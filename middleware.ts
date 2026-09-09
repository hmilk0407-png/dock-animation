import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /* 静的アセット・画像・カレンダー受け口(合言葉で保護)以外のすべてのパスで認証を確認 */
    "/((?!_next/static|_next/image|favicon.ico|avatars/|milk/|test|api/calendar/ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
