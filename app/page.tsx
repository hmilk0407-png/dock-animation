import { redirect } from "next/navigation";
import OfficeApp from "@/components/OfficeApp";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EXPERTS, rowToExpert } from "@/lib/experts";

export const dynamic = "force-dynamic";

/* ---------- メインページ (サーバーコンポーネント) ----------
   セッション確認 → 初回ログイン時はデフォルト7名をDBへシード → OfficeAppへ引き渡し */
export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: rows } = await supabase
    .from("experts")
    .select("*")
    .order("sort_order");

  if (!rows || rows.length === 0) {
    await supabase.from("experts").insert(
      DEFAULT_EXPERTS.map((e, i) => ({
        user_id: user.id,
        slug: e.slug,
        name: e.name,
        specialty: e.specialty,
        prompt: e.prompt,
        coat: e.coat,
        accessory: e.accessory,
        is_default: true,
        sort_order: i,
      }))
    );
    ({ data: rows } = await supabase
      .from("experts")
      .select("*")
      .order("sort_order"));
  }

  const experts = (rows || []).map(rowToExpert);
  return <OfficeApp initialExperts={experts} userId={user.id} />;
}
