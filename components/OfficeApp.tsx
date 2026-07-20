"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import ChatPanel, { type ChatSendResult } from "./ChatPanel";
import Dock from "./Dock";
import Entrance from "./Entrance";
import ExpertModal from "./ExpertModal";
import Header from "./Header";
import HistoryPanel from "./HistoryPanel";
import Avatar from "./avatars/Avatar";
import { useExperts } from "@/hooks/useExperts";
import { useHistory } from "@/hooks/useHistory";
import { useDockState } from "@/lib/dock/useDockState";
import { SECRETARY_SLUG } from "@/lib/experts";
import { createClient } from "@/lib/supabase/client";
import { BG, BLUE, MARU, TEXT } from "@/lib/theme";
import type {
  Attachment,
  ContentBlock,
  Expert,
  HistoryEntry,
  PlainTurn,
} from "@/lib/types";

/** Composer(onAttachMeta) が返す添付メタ情報 */
type AttachMeta = { count: number; names: string[]; kinds: string[] };

/* Storage URL から表示名・種別を導出するヘルパー */
function nameFromUrl(u: string): string {
  try {
    return decodeURIComponent(u.split("/").pop() || u);
  } catch {
    return u;
  }
}
function kindFromName(n: string): "image" | "pdf" | "text" {
  const ext = (n.toLowerCase().split(".").pop() || "").trim();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "text";
}

/* ============================================================
   OfficeApp — BUHI WORKS メインオーケストレーション
   構成: Entrance(初回オーバーレイ) → ChatPanel(会話) + Dock(専門家カード)

   - onSend(text) を ChatPanel から受け取り、
       assign(担当決定) → answer(回答生成) → 履歴保存 を実行して
       ChatSendResult { expert, note?, answer } を返す
   - 履歴ストア(useHistory ※useHistoryStore相当)と連動:
       担当決定時に waiting で登録 → 回答完了で done / 失敗で error に更新
   - 履歴の↺再依頼: reuseText を ChatPanel へ渡し InputBar に初期値をセット
   - 担当切替時: dockAck シグナルで該当カードが一跳ねする (Framer Motion)
   - 現在担当(currentExpert)・指名(pinnedSlug)・busy を state で管理
   ============================================================ */

export default function OfficeApp({
  initialExperts,
  userId,
}: {
  initialExperts: Expert[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { experts, saveExpert, removeExpert } = useExperts(initialExperts, userId);
  const history = useHistory(); // 履歴ストア
  const dock = useDockState(); // 受付ミルクの状態機械

  /* ---------- 画面・担当の状態管理 ---------- */
  const [uiMode, setUiMode] = useState<"entrance" | "office">("entrance");
  const [busy, setBusy] = useState(false);
  /** 現在の担当専門家 (ルーティング確定で切替わり、完了後も直近担当として保持) */
  const [currentExpert, setCurrentExpert] = useState<Expert | null>(null);
  /** Dockで指名中の専門家slug (指名時は受付を通さず直行) */
  const [pinnedSlug, setPinnedSlug] = useState<string | null>(null);
  /** 担当切替/再依頼時にDockの該当カードを一跳ねさせるシグナル */
  const [dockAck, setDockAck] = useState<{ expertSlug: string; ts: number } | null>(null);
  /** 履歴↺: ChatPanel内のInputBarへ初期値を流し込む */
  const [reuseText, setReuseText] = useState<{ text: string; ts: number } | null>(null);
  /** Composerの添付メタ情報 (HistoryPanelの添付表示連動用) */
  const [attachMeta, setAttachMeta] = useState<AttachMeta | null>(null);
  /** 履歴↺で引き継ぐ前回添付の Storage URL リスト (次の送信で1回だけ消費) */
  const [reuseAttachUrls, setReuseAttachUrls] = useState<string[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  /** 会話文脈: ChatPanelは表示専任のため、送受信テキストを親側で保持して回答APIへ同送 */
  const turnsRef = useRef<PlainTurn[]>([]);

  const secretary =
    experts.find((e) => e.slug === SECRETARY_SLUG) || experts[0] || null;
  const pinnedExpert =
    (pinnedSlug && experts.find((e) => e.slug === pinnedSlug)) || null;
  const headerExpert = pinnedExpert || currentExpert;

  /* ackシグナルは一定時間で自動クリア (一跳ねを1回きりにする) */
  useEffect(() => {
    if (!dockAck) return;
    const t = setTimeout(() => setDockAck(null), 900);
    return () => clearTimeout(t);
  }, [dockAck]);

  /* ---------- 送信フロー: assign → answer → 履歴保存 ---------- */
  async function handleSend(
    text: string,
    attachments: Attachment[] = []
  ): Promise<ChatSendResult> {
    if (uiMode === "entrance") setUiMode("office");
    /* 今回のアップロード済みURL + ↺で引き継いだ前回URL */
    const currentUrls = attachments
      .map((a) => a.url)
      .filter((u): u is string => !!u);
    const allAttachUrls = [...currentUrls, ...reuseAttachUrls];
    /* 担当決定・履歴表示の参考に使う人間可読な名前 */
    const attachNames = allAttachUrls.map(nameFromUrl);
    if (!secretary && !pinnedExpert) {
      throw new Error("専門家の名簿が読み込めていません。画面を再読み込みしてください");
    }

    setBusy(true);
    dock.trigger({ type: "api:start" });
    setCurrentExpert(pinnedExpert || secretary);
    let historyId: string | null = null;

    try {
      /* 1. 担当決定 (指名中は受付を通さず直行) */
      let expert: Expert;
      let note: string | undefined;
      if (pinnedExpert) {
        expert = pinnedExpert;
        note = "ご指名につき、直接担当いたします。";
      } else {
        const assignRes = await fetch("/api/assign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, attachmentNames: attachNames }),
        });
        const assignData = await assignRes.json();
        if (!assignRes.ok) throw new Error(assignData.error || "担当決定に失敗しました");
        expert = experts.find((e) => e.slug === assignData.slug) || secretary!;
        note = assignData.note || "";
      }

      /* 担当切替: 現在担当を更新し、Dockの該当カードを一跳ねさせる (Framer Motion) */
      setCurrentExpert(expert);
      setDockAck({ expertSlug: expert.slug, ts: Date.now() });

      /* 2. 履歴ストアへ waiting で登録 */
      historyId = await history.addEntry({
        expertSlug: expert.slug,
        expertName: expert.name,
        specialty: expert.specialty,
        requestText: text,
        attachments: allAttachUrls,
      });

      /* 3. 回答生成 (添付をブロック化し、直近12ターンの文脈と同送)
            画像/PDFは Storage URL を source.url で送る (base64はフォールバック) */
      const blocks: ContentBlock[] = [];
      for (const a of attachments) {
        if (a.kind === "image") {
          blocks.push(
            a.url
              ? { type: "image", source: { type: "url", url: a.url } }
              : {
                  type: "image",
                  source: { type: "base64", media_type: a.media || "image/png", data: a.b64! },
                }
          );
        } else if (a.kind === "pdf") {
          blocks.push(
            a.url
              ? { type: "document", source: { type: "url", url: a.url } }
              : {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: a.b64! },
                }
          );
        }
      }
      /* ↺再依頼: 前回添付URLを種別判定して image/document ブロックを再生成 */
      for (const u of reuseAttachUrls) {
        const k = kindFromName(nameFromUrl(u));
        if (k === "image") {
          blocks.push({ type: "image", source: { type: "url", url: u } });
        } else if (k === "pdf") {
          blocks.push({ type: "document", source: { type: "url", url: u } });
        }
      }
      let combined = "";
      if (reuseAttachUrls.length > 0) {
        combined += `【再依頼: 前回の添付 ${reuseAttachUrls.map(nameFromUrl).join("、")} を参照】\n\n`;
      }
      for (const a of attachments) {
        if (a.kind === "text") {
          combined += `【添付ファイル: ${a.name}】\n${a.text}\n【添付ここまで】\n\n`;
        }
      }
      combined +=
        text || "添付ファイルの内容を確認し、指示書に沿って対応してください。";
      blocks.push({ type: "text", text: combined });
      const answerRes = await fetch("/api/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expertSlug: expert.slug,
          history: turnsRef.current.slice(-12),
          blocks,
        }),
      });
      const answerData = await answerRes.json();
      if (!answerRes.ok) throw new Error(answerData.error || "回答生成に失敗しました");
      const answer: string = answerData.text || "";

      /* 4. 履歴: waiting → done */
      if (historyId) {
        void history.updateEntry(historyId, {
          response_preview: answer.replace(/\s+/g, " ").slice(0, 120),
          status: "done",
        });
      }

      /* 文脈を蓄積 (直近12往復ぶんだけ保持) */
      const newTurns: PlainTurn[] = [
        { role: "user", content: combined },
        { role: "assistant", content: answer },
      ];
      turnsRef.current = [...turnsRef.current, ...newTurns].slice(-24);

      dock.trigger({ type: "api:success" });
      return { expert, note, answer };
    } catch (err) {
      dock.trigger({ type: "api:error" });
      /* 履歴: waiting → error */
      if (historyId) {
        void history.updateEntry(historyId, {
          response_preview: "（通信エラーで中断）",
          status: "error",
        });
      }
      throw err instanceof Error ? err : new Error("送信に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Composer → 添付メタ情報の受け取り ---------- */
  const handleAttachMeta = useCallback((meta: AttachMeta) => {
    setAttachMeta(meta);
  }, []);

  /* ---------- 履歴の↺再依頼: InputBarへ流し込み + 担当カードの一跳ね ---------- */
  function handleReuse(text: string, entry?: HistoryEntry) {
    setShowHistory(false);
    setReuseText({ text, ts: Date.now() });
    setReuseAttachUrls(entry ? entry.attachments : []);
    if (entry) setDockAck({ expertSlug: entry.expert_slug, ts: Date.now() });
  }

  function handleRemoveExpert(slug: string) {
    const target = experts.find((e) => e.slug === slug);
    if (!target || target.isDefault) return;
    if (!window.confirm(`${target.name}(${target.specialty})をチームから外しますか？`)) return;
    if (pinnedSlug === slug) setPinnedSlug(null);
    void removeExpert(slug).catch((err) =>
      window.alert(err instanceof Error ? err.message : "削除に失敗しました")
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: BG, color: TEXT }}>
      {/* ---------- ブランドヘッダー (sticky top-0 / 近未来トーン) ---------- */}
      <Header
        actions={
          <>
            {/* 現在担当 / 指名中のチップ */}
            {headerExpert && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full"
                style={{
                  background: "rgba(46,95,216,0.22)",
                  border: "1px solid rgba(127,168,255,0.45)",
                }}
              >
                <Avatar expert={headerExpert} size={18} badge={false} />
                <span
                  style={{ fontSize: 10.5, fontWeight: 900, fontFamily: MARU, color: "#F2F6FF" }}
                >
                  {pinnedExpert ? `指名: ${pinnedExpert.name}` : `担当: ${currentExpert!.name}`}
                </span>
              </div>
            )}
            {/* 履歴ボタン */}
            <button
              onClick={() => setShowHistory(true)}
              aria-label="依頼履歴を開く"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg flex-shrink-0"
              style={{
                background: "rgba(46,95,216,0.22)",
                border: "1px solid rgba(127,168,255,0.45)",
                fontSize: 12,
                fontWeight: 700,
                color: "#F2F6FF",
              }}
            >
              🕘 履歴
              {history.entries.length > 0 && (
                <span
                  style={{
                    background: "#F2F6FF",
                    color: BLUE,
                    borderRadius: 9,
                    padding: "0 6px",
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  {history.entries.length}
                </span>
              )}
            </button>
            {/* ログアウトボタン */}
            <button
              onClick={logout}
              aria-label="ログアウト"
              className="px-2.5 py-1.5 rounded-lg flex-shrink-0"
              style={{
                background: "transparent",
                border: "1px solid rgba(242,246,255,0.35)",
                fontSize: 12,
                fontWeight: 700,
                color: "rgba(242,246,255,0.8)",
              }}
            >
              ログアウト
            </button>
          </>
        }
      />

      {/* ---------- 中央: ChatPanel + Dock ---------- */}
      <div className="relative flex-1 flex flex-col min-h-0">
        <ChatPanel
          experts={experts}
          onSend={handleSend}
          onAttachMeta={handleAttachMeta}
          onDockEvent={dock.trigger}
          reuseText={reuseText}
          className="flex flex-col flex-1 min-h-0"
        />
        <Dock
          experts={experts}
          milkState={dock.state}
          milkTransitioning={dock.isTransitioning}
          workingExpert={busy ? currentExpert : null}
          uiMode={uiMode}
          reuseSignal={dockAck}
          onOpenExpert={(e) => setEditingExpert(e)}
          onAddExpert={() => setShowAddModal(true)}
          onRemoveExpert={handleRemoveExpert}
          selectedSlug={pinnedSlug}
          onSelectExpert={(e) => setPinnedSlug(e ? e.slug : null)}
        />
      </div>

      {/* ---------- エントランス (初回のみ全画面オーバーレイ) ---------- */}
      <AnimatePresence>
        {uiMode === "entrance" && (
          <motion.div
            key="entrance"
            className="fixed inset-0 z-40 overflow-hidden"
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <Entrance onEnter={() => setUiMode("office")} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- 履歴パネル ---------- */}
      {showHistory && (
        <HistoryPanel
          entries={history.entries}
          experts={experts}
          currentSlug={currentExpert?.slug ?? null}
          attachMeta={attachMeta}
          onClose={() => setShowHistory(false)}
          onRemove={(id) => void history.removeEntry(id)}
          onClearAll={() => void history.clearAll()}
          onReuse={handleReuse}
        />
      )}

      {/* ---------- 専門家 採用/編集モーダル ---------- */}
      {(showAddModal || editingExpert) && (
        <ExpertModal
          initial={editingExpert || undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingExpert(null);
          }}
          onSave={async (expert, pendingPhoto) => {
            await saveExpert(expert, pendingPhoto);
            setShowAddModal(false);
            setEditingExpert(null);
          }}
        />
      )}
    </div>
  );
}
