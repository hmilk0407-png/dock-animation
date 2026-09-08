"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import ChatPanel, { type ChatSendResult } from "./ChatPanel";
import Entrance from "./Entrance";
import ExpertModal from "./ExpertModal";
import HistoryPanel from "./HistoryPanel";
import MilkAnimation, { type MilkManifest } from "./MilkAnimation";
import Avatar from "./avatars/Avatar";
import { useExperts } from "@/hooks/useExperts";
import { useHistory } from "@/hooks/useHistory";
import { DockState } from "@/lib/dock/DockState";
import { useDockState } from "@/lib/dock/useDockState";
import { SECRETARY_SLUG } from "@/lib/experts";
import { createClient } from "@/lib/supabase/client";
import { BG, BLUE, CARD, CHIP, LINE, MARU, MUTED, NAVY, RED, TEXT } from "@/lib/theme";
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


/* ---------- エージェントパネル: 状態表示ラベル ---------- */
const AGENT_TASK: Record<DockState, string> = {
  [DockState.Idle]: "受付でお待ちしています",
  [DockState.Focus]: "ご依頼を確認しています",
  [DockState.Success]: "おつなぎできました！",
  [DockState.Error]: "うまくいきませんでした",
  [DockState.Thinking]: "ご提案を考えています",
  [DockState.Listening]: "お話をうかがっています",
  [DockState.Loading]: "受付からおつなぎしています",
  [DockState.Surprised]: "少し驚いています",
  [DockState.Transition]: "切り替え中…",
};
const AGENT_STATUS: Record<DockState, { label: string; color: string }> = {
  [DockState.Idle]: { label: "オンライン", color: "#1E9E6A" },
  [DockState.Focus]: { label: "受付中", color: BLUE },
  [DockState.Listening]: { label: "受付中", color: BLUE },
  [DockState.Thinking]: { label: "作業中", color: BLUE },
  [DockState.Loading]: { label: "作業中", color: BLUE },
  [DockState.Success]: { label: "完了", color: "#1E9E6A" },
  [DockState.Error]: { label: "エラー", color: RED },
  [DockState.Surprised]: { label: "対応中", color: "#E8912D" },
  [DockState.Transition]: { label: "切替中", color: MUTED },
};

/* ---------- ミルク本体: 写真版 (public/milk/photo/*.jpg) ----------
   メイン画面のみ写真版に差し替える。/test/dock と E2E は従来の MILK_ASSETS
   (Lottie/WebM/PNG連番) を使うため MilkAnimation 側は変更しない。
   1フレームの pngseq として登録すると <img> がそのまま表示される。 */
const photo = (name: string) => ({
  kind: "pngseq" as const,
  frames: [`/milk/photo/${name}.jpg`],
  fps: 1,
  loop: true,
});
const MILK_PHOTO: MilkManifest = {
  [DockState.Idle]: photo("idle"),
  [DockState.Focus]: photo("idle"),
  [DockState.Listening]: photo("idle"),
  [DockState.Transition]: photo("idle"),
  [DockState.Thinking]: photo("loading"),
  [DockState.Loading]: photo("loading"),
  [DockState.Success]: photo("success"),
  [DockState.Error]: photo("error"),
  [DockState.Surprised]: photo("surprised"),
};

/* ============================================================
   OfficeApp — BUHI WORKS メインオーケストレーション
   構成: Entrance(初回オーバーレイ) → 3カラム
         [左レール: 専門家スイッチャ+履歴/ログアウト]
         [中央: エージェントパネル (大ミルク + STATUS/TASK/STATSカード)]
         [右: ChatPanel(会話)]

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

  const agentStatus = AGENT_STATUS[dock.state];

  return (
    <div className="h-screen flex" style={{ background: BG, color: TEXT }}>
      {/* ==================== 左レール: 専門家名簿 (md以上=200px名前付き / 未満=64pxアイコンのみ) ==================== */}
      <aside
        className="flex-shrink-0 flex flex-col py-3 gap-1.5 overflow-y-auto buhi-scroll w-16 md:w-[200px] items-center md:items-stretch md:px-2.5"
        style={{ background: NAVY }}
      >
        <div className="flex items-center gap-2 px-1 md:px-2 mb-1">
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ width: 40, height: 40, background: "rgba(255,255,255,0.08)", fontSize: 20 }}
          >
            🐾
          </div>
          <div className="hidden md:block min-w-0">
            <div style={{ fontFamily: MARU, fontWeight: 900, fontSize: 13, color: "#F2F6FF" }}>
              専門家チーム
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>{experts.length}名 在籍</div>
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "2px 4px 4px" }} />

        {/* 専門家 (クリックで指名/解除。指名中は ✎/✕) */}
        {experts.map((e) => {
          const isPinned = pinnedSlug === e.slug;
          const isWorking = busy && currentExpert?.slug === e.slug;
          const ackTs = dockAck?.expertSlug === e.slug ? dockAck.ts : null;
          return (
            <div key={e.slug} className="relative flex-shrink-0 w-full flex justify-center md:justify-stretch">
              <motion.button
                key={ackTs ?? "static"}
                animate={ackTs ? { y: [0, -6, 0] } : { y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                onClick={() => setPinnedSlug(isPinned ? null : e.slug)}
                title={`${e.name}（${e.specialty}）${isPinned ? " — 指名中（タップで解除）" : ""}`}
                aria-label={`${e.name}を${isPinned ? "指名解除" : "指名"}`}
                className="flex items-center gap-2.5 rounded-xl text-left md:w-full md:px-2 md:py-1.5"
                style={{
                  background: isPinned
                    ? "rgba(127,168,255,0.22)"
                    : isWorking
                      ? "rgba(255,211,127,0.16)"
                      : "transparent",
                  border: isPinned
                    ? "1.5px solid #7FA8FF"
                    : isWorking
                      ? "1.5px solid #FFD37F"
                      : "1.5px solid transparent",
                }}
              >
                <span
                  className="rounded-full flex-shrink-0 overflow-hidden block"
                  style={{
                    width: 44,
                    height: 44,
                    border: isPinned
                      ? "2px solid #7FA8FF"
                      : isWorking
                        ? "2px solid #FFD37F"
                        : "2px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <Avatar expert={e} size={40} badge={false} working={isWorking} />
                </span>
                <span className="hidden md:block min-w-0 flex-1">
                  <span
                    className="block truncate"
                    style={{ fontFamily: MARU, fontWeight: 900, fontSize: 13, color: "#F2F6FF" }}
                  >
                    {e.name}
                    {isPinned && (
                      <span style={{ fontSize: 9.5, color: "#BFD3FF", marginLeft: 5, fontWeight: 700 }}>
                        指名中
                      </span>
                    )}
                    {isWorking && !isPinned && (
                      <span style={{ fontSize: 9.5, color: "#FFE3A3", marginLeft: 5, fontWeight: 700 }}>
                        対応中
                      </span>
                    )}
                  </span>
                  <span
                    className="block truncate"
                    style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)" }}
                  >
                    {e.specialty}
                  </span>
                </span>
              </motion.button>
              {isPinned && (
                <div className="absolute right-0 md:right-2 -bottom-1 md:bottom-auto md:top-1/2 md:-translate-y-1/2 flex gap-0.5">
                  <button
                    onClick={() => setEditingExpert(e)}
                    title="設定"
                    aria-label={`${e.name}の設定を開く`}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      background: "#F2F6FF",
                      color: NAVY,
                      fontSize: 10,
                      lineHeight: "20px",
                      fontWeight: 900,
                    }}
                  >
                    ✎
                  </button>
                  {!e.isDefault && (
                    <button
                      onClick={() => handleRemoveExpert(e.slug)}
                      title="チームから外す"
                      aria-label={`${e.name}をチームから外す`}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        background: "#F2F6FF",
                        color: RED,
                        fontSize: 10,
                        lineHeight: "20px",
                        fontWeight: 900,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* 採用 */}
        <button
          onClick={() => setShowAddModal(true)}
          title="専門家を採用"
          aria-label="新しい専門家を採用"
          className="flex items-center justify-center gap-2 flex-shrink-0 rounded-xl md:w-full mt-1"
          style={{
            width: undefined,
            minWidth: 44,
            height: 44,
            border: "1.5px dashed rgba(255,255,255,0.45)",
            color: "rgba(255,255,255,0.85)",
            fontWeight: 900,
            fontSize: 14,
            background: "transparent",
          }}
        >
          ＋<span className="hidden md:inline" style={{ fontFamily: MARU, fontSize: 12 }}>専門家を採用</span>
        </button>

        <div className="flex-1" />

        {/* 履歴 / ログアウト */}
        <button
          onClick={() => setShowHistory(true)}
          title="依頼履歴"
          aria-label="依頼履歴を開く"
          className="relative flex items-center justify-center md:justify-start gap-2 flex-shrink-0 rounded-xl md:w-full md:px-2"
          style={{
            minWidth: 40,
            height: 40,
            background: "rgba(255,255,255,0.08)",
            color: "#F2F6FF",
            fontSize: 15,
          }}
        >
          🕘
          <span className="hidden md:inline" style={{ fontFamily: MARU, fontSize: 12, fontWeight: 700 }}>
            依頼履歴
          </span>
          {history.entries.length > 0 && (
            <span
              className="absolute -top-1 -right-1 md:static md:ml-auto"
              style={{
                background: "#F2F6FF",
                color: NAVY,
                borderRadius: 8,
                padding: "0 6px",
                fontSize: 9.5,
                fontWeight: 900,
              }}
            >
              {history.entries.length}
            </span>
          )}
        </button>
        <button
          onClick={logout}
          title="ログアウト"
          aria-label="ログアウト"
          className="flex items-center justify-center md:justify-start gap-2 flex-shrink-0 rounded-xl md:w-full md:px-2"
          style={{
            minWidth: 40,
            height: 40,
            border: "1px solid rgba(255,255,255,0.3)",
            color: "rgba(255,255,255,0.8)",
            fontSize: 13,
            background: "transparent",
          }}
        >
          ⏻
          <span className="hidden md:inline" style={{ fontFamily: MARU, fontSize: 12, fontWeight: 700 }}>
            ログアウト
          </span>
        </button>
      </aside>

      {/* ==================== 中央: エージェントパネル ==================== */}
      <main className="flex-1 min-w-0 hidden md:flex flex-col">
        <div
          className="flex items-center gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${LINE}`, background: BG }}
        >
          <span style={{ fontFamily: MARU, fontWeight: 900, fontSize: 17, color: TEXT }}>
            🐾 BUHI WORKS
          </span>
          <span
            className="rounded-md px-1.5 py-0.5"
            style={{ fontSize: 10, color: "#BFD3FF", fontWeight: 800, background: CHIP, border: `1px solid ${LINE}` }}
          >
            v2.0
          </span>
          <span style={{ fontSize: 10.5, color: MUTED, fontWeight: 700 }}>AIバックオフィス</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto buhi-scroll px-5 py-5">
          <div className="flex flex-col lg:flex-row gap-5 items-center lg:items-start justify-center">
            {/* ステータスカード列 */}
            <div className="flex flex-col gap-3 w-full lg:w-60 flex-shrink-0 order-2 lg:order-1">
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: CARD, border: `1px solid ${LINE}` }}
              >
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: 0.6 }}>
                  AGENT STATUS
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 9, height: 9, background: agentStatus.color }}
                  />
                  <span
                    style={{
                      fontFamily: MARU,
                      fontWeight: 900,
                      fontSize: 16,
                      color: agentStatus.color,
                    }}
                  >
                    {agentStatus.label}
                  </span>
                </div>
              </div>

              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: CARD, border: `1px solid ${LINE}` }}
              >
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: 0.6 }}>
                  CURRENT TASK
                </div>
                <div
                  className="mt-1"
                  style={{ fontFamily: MARU, fontWeight: 800, fontSize: 13.5, color: TEXT }}
                >
                  {AGENT_TASK[dock.state]}
                </div>
              </div>

              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: CARD, border: `1px solid ${LINE}` }}
              >
                <div style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: 0.6 }}>
                  担当エキスパート
                </div>
                {headerExpert ? (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar expert={headerExpert} size={26} badge={false} />
                    <div className="min-w-0">
                      <div
                        className="truncate"
                        style={{ fontFamily: MARU, fontWeight: 900, fontSize: 13.5 }}
                      >
                        {headerExpert.name}
                        {pinnedExpert && (
                          <span style={{ fontSize: 9.5, color: BLUE, marginLeft: 5 }}>指名中</span>
                        )}
                      </div>
                      <div className="truncate" style={{ fontSize: 10.5, color: MUTED }}>
                        {headerExpert.specialty}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1" style={{ fontSize: 12, color: MUTED }}>
                    ご依頼に応じて受付がおつなぎします
                  </div>
                )}
              </div>
            </div>

            {/* ミルク本体 + AGENT STATS */}
            <div className="flex flex-col items-center gap-4 flex-1 min-w-0 order-1 lg:order-2">
              <div
                style={{
                  width: 280,
                  height: 280,
                  background: "linear-gradient(180deg, #D9DEE5 0%, #C3CAD4 100%)",
                  border: `1px solid ${LINE}`,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.45), 0 0 0 4px rgba(59,123,246,0.12)",
                }}
                className="relative flex-shrink-0 rounded-3xl overflow-hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={dock.state}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: dock.isTransitioning ? 0.85 : 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <MilkAnimation state={dock.state} size={280} manifest={MILK_PHOTO} />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div
                className="w-full rounded-2xl"
                style={{
                  maxWidth: 420,
                  background: CARD,
                  border: `1px solid ${LINE}`,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  className="px-4 pt-3 pb-2"
                  style={{
                    fontFamily: MARU,
                    fontWeight: 900,
                    fontSize: 13,
                    color: TEXT,
                    borderBottom: `1px solid ${LINE}`,
                  }}
                >
                  AGENT STATS
                </div>
                <dl
                  className="px-4 py-3 grid gap-x-5 gap-y-1.5"
                  style={{ fontSize: 12, gridTemplateColumns: "auto 1fr" }}
                >
                  <dt style={{ color: MUTED, fontWeight: 700 }}>名前</dt>
                  <dd style={{ fontWeight: 700 }}>ミルク（受付・秘書）</dd>
                  <dt style={{ color: MUTED, fontWeight: 700 }}>モデル</dt>
                  <dd>BUHI WORKS v2.0</dd>
                  <dt style={{ color: MUTED, fontWeight: 700 }}>専門家</dt>
                  <dd>{experts.length}名 在籍</dd>
                  <dt style={{ color: MUTED, fontWeight: 700 }}>状態</dt>
                  <dd>{AGENT_TASK[dock.state]}</dd>
                  <dt style={{ color: MUTED, fontWeight: 700 }}>言語</dt>
                  <dd>日本語</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ==================== 右: エージェント・チャット ==================== */}
      <section
        className="flex flex-col min-h-0 flex-1 md:flex-none md:w-[400px] lg:w-[430px]"
        style={{ background: BG, borderLeft: `1px solid ${LINE}` }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: `1px solid ${LINE}` }}
        >
          <span style={{ fontFamily: MARU, fontWeight: 900, fontSize: 14, color: TEXT }}>
            エージェント・チャット
          </span>
          {headerExpert && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full"
              style={{ background: CHIP, border: `1px solid ${LINE}` }}
            >
              <Avatar expert={headerExpert} size={18} badge={false} />
              <span style={{ fontSize: 10.5, fontWeight: 900, fontFamily: MARU, color: "#BFD3FF" }}>
                {pinnedExpert ? `指名: ${pinnedExpert.name}` : `担当: ${currentExpert!.name}`}
              </span>
            </div>
          )}
        </div>
        <ChatPanel
          experts={experts}
          onSend={handleSend}
          onAttachMeta={handleAttachMeta}
          onDockEvent={dock.trigger}
          reuseText={reuseText}
          className="flex flex-col flex-1 min-h-0"
        />
      </section>

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
