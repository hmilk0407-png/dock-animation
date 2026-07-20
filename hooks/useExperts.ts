"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { rowToExpert } from "@/lib/experts";
import type { Expert } from "@/lib/types";

/* ---------- 専門家チームの状態とCRUD (Supabase永続化) ----------
   初期データはサーバーコンポーネントから受け取り、以降の変更を楽観的に反映する。
   写真は Storage の avatars/{uid}/{slug}.jpg に upsert し、公開URLを experts.photo_url へ。 */
export function useExperts(initial: Expert[], userId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [experts, setExperts] = useState<Expert[]>(initial);

  async function uploadPhoto(slug: string, dataUrl: string): Promise<string> {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${userId}/${slug}.jpg`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) throw new Error(`写真のアップロードに失敗しました: ${error.message}`);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`; // キャッシュバスター
  }

  async function removePhotoObject(slug: string) {
    await supabase.storage.from("avatars").remove([`${userId}/${slug}.jpg`]);
  }

  /**
   * 追加/更新の統合保存。
   * pendingPhoto: undefined=変更なし / null=写真削除(既定に戻す) / dataURL=新しい写真
   */
  async function saveExpert(
    expert: Expert,
    pendingPhoto: string | null | undefined
  ): Promise<Expert> {
    let photoUrl = expert.photoUrl ?? null;
    if (pendingPhoto === null) {
      await removePhotoObject(expert.slug);
      photoUrl = null;
    } else if (typeof pendingPhoto === "string") {
      photoUrl = await uploadPhoto(expert.slug, pendingPhoto);
    }

    const payload = {
      slug: expert.slug,
      name: expert.name,
      specialty: expert.specialty,
      prompt: expert.prompt,
      coat: expert.coat,
      accessory: expert.accessory,
      is_default: expert.isDefault,
      photo_url: photoUrl,
      sort_order: expert.sortOrder ?? experts.length,
      updated_at: new Date().toISOString(),
    };

    const existing = experts.find((e) => e.slug === expert.slug);
    if (existing?.id) {
      const { data, error } = await supabase
        .from("experts")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(`保存に失敗しました: ${error.message}`);
      const updated = rowToExpert(data);
      setExperts((list) => list.map((e) => (e.slug === updated.slug ? updated : e)));
      return updated;
    }

    const { data, error } = await supabase
      .from("experts")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(`保存に失敗しました: ${error.message}`);
    const created = rowToExpert(data);
    setExperts((list) => [...list, created]);
    return created;
  }

  async function removeExpert(slug: string) {
    const target = experts.find((e) => e.slug === slug);
    if (!target || target.isDefault) return;
    const { error } = await supabase.from("experts").delete().eq("slug", slug);
    if (error) throw new Error(`削除に失敗しました: ${error.message}`);
    await removePhotoObject(slug);
    setExperts((list) => list.filter((e) => e.slug !== slug));
  }

  return { experts, saveExpert, removeExpert };
}
