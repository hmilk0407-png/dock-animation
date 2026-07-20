"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HistoryEntry } from "@/lib/types";

export const MAX_HISTORY = 200; // 表示・保持の上限 (古い順に自動削除)
export const MAX_REQ_CHARS = 2000; // 依頼本文の保存上限文字数

/* ---------- 依頼履歴ストア (Supabase版) ----------
   v3の window.storage 実装を requests テーブルに置き換えたもの。
   依頼が専門家に割り当たった時点で自動記録し、回答完了/エラーで status を更新する。
   RLSにより自分の行のみ読み書き可能。マルチデバイスで同じ履歴が見える。 */
export function useHistory() {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(MAX_HISTORY);
      if (data) setEntries(data as HistoryEntry[]);
      setLoaded(true);
    })();
  }, [supabase]);

  /** 依頼の記録。作成した履歴IDを返す (回答後の追記に使う)。失敗時は null。 */
  async function addEntry(input: {
    expertSlug: string;
    expertName: string;
    specialty: string;
    requestText: string;
    attachments: string[];
  }): Promise<string | null> {
    const { data, error } = await supabase
      .from("requests")
      .insert({
        expert_slug: input.expertSlug,
        expert_name: input.expertName,
        specialty: input.specialty,
        request_text: String(input.requestText || "").slice(0, MAX_REQ_CHARS),
        attachments: input.attachments,
        status: "waiting",
      })
      .select()
      .single();
    if (error || !data) {
      console.error("履歴の保存に失敗しました", error);
      return null;
    }
    setEntries((prev) => [data as HistoryEntry, ...prev].slice(0, MAX_HISTORY));
    // 上限超過分をサーバー側でも掃除 (ベストエフォート)
    void pruneOverflow();
    return data.id as string;
  }

  async function pruneOverflow() {
    const { data } = await supabase
      .from("requests")
      .select("id")
      .order("requested_at", { ascending: false })
      .range(MAX_HISTORY, MAX_HISTORY + 49);
    if (data && data.length > 0) {
      await supabase
        .from("requests")
        .delete()
        .in(
          "id",
          data.map((r) => r.id)
        );
    }
  }

  async function updateEntry(id: string, patch: Partial<HistoryEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const { error } = await supabase.from("requests").update(patch).eq("id", id);
    if (error) console.error("履歴の更新に失敗しました", error);
  }

  async function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("requests").delete().eq("id", id);
  }

  async function clearAll() {
    setEntries([]);
    await supabase
      .from("requests")
      .delete()
      .gte("requested_at", "1970-01-01T00:00:00Z");
  }

  return { entries, loaded, addEntry, updateEntry, removeEntry, clearAll };
}

export function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
