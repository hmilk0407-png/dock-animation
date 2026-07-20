"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Avatar from "./avatars/Avatar";
import { MAX_HISTORY, fmtDateTime } from "@/hooks/useHistory";
import { BLUE, CARD, CHIP, LINE, MARU, MUTED, RED, TEXT } from "@/lib/theme";
import type { Expert, HistoryEntry } from "@/lib/types";

/* ============================================================
   HistoryPanel — 依頼履歴パネル
   - 履歴ストア(useHistory ※useHistoryStore相当)のデータを props で受け取り一覧表示
     (entries / onRemove / onClearAll が store の entries /
      removeEntry / clearAll に対応する)
   - 専門家別フィルタ (アバター+件数付きチップ)
   - 依頼本文の全文展開⇄折りたたみ (160字超のみトグル表示)
   - 個別削除(×) と 全削除 (それぞれ confirm 付き)
   - ↺再依頼: 担当キャラが一跳ね→「了解です！」→ 650ms後に
     onReuse(request_text, entry) で依頼本文を OfficeApp へ返す
   - キャラ反応は Framer Motion (案内役のあいさつ / 担当キャラのアック)
   - モバイルはボトムシート、sm以上は中央モーダルのレスポンシブ設計
   ============================================================ */

export default function HistoryPanel({
  entries,
  experts,
  onClose,
  onRemove,
  onClearAll,
  onReuse,
  attachMeta = null,
  currentSlug = null,
}: {
  entries: HistoryEntry[];
  experts: Expert[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  /** ↺再依頼: 依頼本文を返す。entry は担当カード演出などの補助情報 */
  onReuse: (text: string, entry?: HistoryEntry) => void;
  /** Composer(onAttachMeta)から渡される現在の添付メタ情報 */
  attachMeta?: { count: number; names: string[]; kinds: string[] } | null;
  /** 現在担当の専門家slug (フィルタで先頭に並べて強調する) */
  currentSlug?: string | null;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ackId, setAckId] = useState<string | null>(null); // 「了解です」演出中の履歴ID

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.expert_slug === filter);
  /* フィルタ表示順: 現在担当を先頭に、残りは名簿順 */
  const orderedExperts = [
    ...experts.filter((x) => x.slug === currentSlug),
    ...experts.filter((x) => x.slug !== currentSlug),
  ];
  const countOf = (slug: string) =>
    entries.filter((e) => e.expert_slug === slug).length;

  /* パネルの案内役: すべて=受付 / 絞り込み中=その専門家 */
  const featured =
    filter === "all"
      ? experts.find((x) => x.slug === "secretary") || experts[0]
      : experts.find((x) => x.slug === filter);

  /* Escで閉じる */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ---------- ↺再依頼: キャラ反応 → OfficeAppへ返す ---------- */
  function handleReuse(entry: HistoryEntry) {
    if (ackId) return;
    setAckId(entry.id);
    setTimeout(() => {
      setAckId(null);
      onReuse(entry.request_text, entry);
    }, 650);
  }

  function handleRemove(entry: HistoryEntry) {
    if (!window.confirm("この履歴を削除しますか？")) return;
    onRemove(entry.id);
  }

  function handleClearAll() {
    if (entries.length === 0) return;
    if (!window.confirm(`このオフィスの履歴をすべて削除しますか？（全${entries.length}件）`)) return;
    onClearAll();
  }

  const statusChip = (s: HistoryEntry["status"]) =>
    s === "waiting"
      ? { label: "対応中", color: "#8A6D1D", bg: "#FBF3D9" }
      : s === "error"
        ? { label: "エラー", color: RED, bg: "#FBE4E4" }
        : { label: "完了", color: BLUE, bg: CHIP };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="依頼履歴"
    >
      {/* 背景 */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(20,28,46,0.42)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* パネル本体: モバイル=ボトムシート / sm以上=中央モーダル */}
      <motion.div
        className="relative w-full sm:max-w-2xl flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{
          background: CARD,
          maxHeight: "92dvh",
          boxShadow: "0 -8px 40px rgba(20,38,62,0.25)",
        }}
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(ev) => ev.stopPropagation()}
      >
        {/* ドラッグハンドル (モバイルのみ) */}
        <div
          className="sm:hidden mx-auto mt-2 rounded-full flex-shrink-0"
          style={{ width: 44, height: 6, background: "rgba(20,38,62,0.18)" }}
        />

        {/* ---------- ヘッダー: 案内役 + タイトル + 閉じる ---------- */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${LINE}` }}
        >
          {featured && (
            <motion.div
              key={`greet-${filter}`}
              animate={{ rotate: [0, -7, 5, -3, 0], scale: [1, 1.07, 1] }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
            >
              <Avatar expert={featured} size={40} />
            </motion.div>
          )}
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 14, fontWeight: 900, fontFamily: MARU }}>
              ご依頼の記録
            </div>
            <div style={{ fontSize: 10.5, color: MUTED }}>
              {filter === "all"
                ? `全部で ${entries.length} 件です`
                : `${featured?.name || "この専門家"}宛は ${filtered.length} 件です`}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="履歴パネルを閉じる"
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              width: 30,
              height: 30,
              border: `1.5px solid ${LINE}`,
              color: MUTED,
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            ×
          </button>
        </div>

        {/* ---------- 専門家フィルタ (件数付きチップ) ---------- */}
        <div
          className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0 buhi-scroll"
          style={{ borderBottom: `1px solid ${LINE}` }}
        >
          <button
            onClick={() => setFilter("all")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              fontSize: 10.5,
              fontWeight: 900,
              fontFamily: MARU,
              background: filter === "all" ? CHIP : "transparent",
              border: `1.5px solid ${filter === "all" ? BLUE : LINE}`,
              color: filter === "all" ? BLUE : TEXT,
            }}
          >
            すべて
            <span style={{ fontSize: 9.5, color: MUTED }}>{entries.length}</span>
          </button>
          {orderedExperts.map((x) => {
            const isCur = x.slug === currentSlug;
            return (
              <button
                key={x.slug}
                onClick={() => setFilter(x.slug)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0 ${
                  isCur ? "border border-blue-300 bg-blue-900/40" : ""
                }`}
                style={{
                  fontSize: 10.5,
                  fontWeight: 900,
                  fontFamily: MARU,
                  background: isCur ? undefined : filter === x.slug ? CHIP : "transparent",
                  border: isCur
                    ? undefined
                    : `1.5px solid ${filter === x.slug ? BLUE : LINE}`,
                  color: isCur ? "#F2F6FF" : filter === x.slug ? BLUE : TEXT,
                }}
              >
                <Avatar expert={x} size={18} badge={false} />
                {x.name}
                <span
                  style={{ fontSize: 9.5, color: isCur ? "rgba(242,246,255,0.75)" : MUTED }}
                >
                  {countOf(x.slug)}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------- 履歴一覧 ---------- */}
        <div
          className="flex-1 overflow-y-auto buhi-scroll"
          style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
        >
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center" style={{ fontSize: 12, color: MUTED }}>
              {filter === "all"
                ? "まだご依頼の記録はありません"
                : `${featured?.name || "この専門家"}宛のご依頼はまだありません`}
            </div>
          )}

          {filtered.map((e) => {
            const isLong = e.request_text.length > 160;
            const isOpen = Boolean(expanded[e.id]);
            const chip = statusChip(e.status);
            const acking = ackId === e.id;
            return (
              <div
                key={e.id}
                className="flex items-start gap-2.5 px-4 py-3"
                style={{ borderBottom: `1px solid ${LINE}` }}
              >
                {/* 担当キャラ: ↺で軽く一跳ねして反応 (Framer Motion) */}
                <div className="relative flex-shrink-0">
                  <motion.div
                    key={acking ? `ack-${e.id}-${ackId}` : `idle-${e.id}`}
                    animate={
                      acking
                        ? { scale: [1, 1.08, 1], rotate: [-2, 2, 0] }
                        : { rotate: 0, scale: 1 }
                    }
                    transition={{ duration: 0.45, ease: [0.34, 1.3, 0.64, 1] }}
                  >
                    <Avatar expert={expertOf(experts, e)} size={30} badge={false} />
                  </motion.div>
                  <AnimatePresence>
                    {acking && (
                      <motion.div
                        key="ackbubble"
                        initial={{ opacity: 0, y: 4, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full"
                        style={{
                          top: -22,
                          background: BLUE,
                          color: "#FFF",
                          fontSize: 9,
                          fontWeight: 900,
                          fontFamily: MARU,
                        }}
                      >
                        了解です！
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 本文 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span style={{ fontSize: 12, fontWeight: 900, fontFamily: MARU }}>
                      {e.expert_name}
                    </span>
                    <span style={{ fontSize: 10, color: MUTED }}>{e.specialty}</span>
                    <span
                      className="px-1.5 rounded-full"
                      style={{ fontSize: 9, fontWeight: 900, color: chip.color, background: chip.bg }}
                    >
                      {chip.label}
                    </span>
                    {e.attachments.length > 0 && (
                      <span
                        title={`添付あり（${e.attachments.length}件）`}
                        aria-label={`添付あり（${e.attachments.length}件）`}
                        className="flex items-center justify-center rounded-full flex-shrink-0"
                        style={{
                          width: 16,
                          height: 16,
                          fontSize: 9,
                          color: "#F2F6FF",
                          background:
                            "linear-gradient(180deg, rgba(46,95,216,0.95), rgba(27,68,156,0.95))",
                          border: "1px solid rgba(127,168,255,0.6)",
                          boxShadow: "0 0 6px rgba(46,95,216,0.45)",
                        }}
                      >
                        📎
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 9.5, color: MUTED, marginTop: 1 }}>
                    {fmtDateTime(e.requested_at)}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      lineHeight: 1.7,
                      marginTop: 4,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {isOpen || !isLong ? e.request_text : `${e.request_text.slice(0, 160)}…`}
                  </div>
                  {isLong && (
                    <button
                      onClick={() =>
                        setExpanded((m) => ({ ...m, [e.id]: !isOpen }))
                      }
                      style={{ fontSize: 10.5, fontWeight: 700, color: BLUE, marginTop: 2 }}
                    >
                      {isOpen ? "たたむ" : "全文を表示"}
                    </button>
                  )}

                  {e.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {e.attachments.map((u, i) => {
                        const nm = attachName(u);
                        const isUrl = /^https?:\/\//.test(u);
                        return isUrl ? (
                          <a
                            key={i}
                            href={u}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={nm}
                            className="px-1.5 py-0.5 rounded"
                            style={{
                              fontSize: 9.5,
                              background: "rgba(46,95,216,0.12)",
                              border: "1px solid rgba(46,95,216,0.25)",
                              color: BLUE,
                              textDecoration: "none",
                            }}
                          >
                            📎 {nm}
                          </a>
                        ) : (
                          <span
                            key={i}
                            title={nm}
                            className="px-1.5 py-0.5 rounded"
                            style={{ fontSize: 9.5, background: "#F1EEE4", color: MUTED }}
                          >
                            📎 {nm}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {e.response_preview && (
                    <div
                      style={{
                        fontSize: 10.5,
                        color: MUTED,
                        marginTop: 4,
                        paddingLeft: 8,
                        borderLeft: `2px solid ${LINE}`,
                      }}
                    >
                      {e.response_preview}
                    </div>
                  )}
                </div>

                {/* アクション: ↺再依頼 / ×削除 */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => handleReuse(e)}
                    disabled={Boolean(ackId)}
                    aria-label="この内容で再依頼する"
                    title="この内容で再依頼"
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 30,
                      height: 30,
                      border: `1.5px solid ${BLUE}`,
                      color: BLUE,
                      fontSize: 14,
                      fontWeight: 900,
                      background: acking ? CHIP : "transparent",
                    }}
                  >
                    ↺
                  </motion.button>
                  <button
                    onClick={() => handleRemove(e)}
                    aria-label="この履歴を削除する"
                    title="削除"
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      border: `1.5px solid ${LINE}`,
                      color: MUTED,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------- フッター: 件数 + 全削除 ---------- */}
        <div
          className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
          style={{
            borderTop: `1px solid ${LINE}`,
            paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
          }}
        >
          <span style={{ fontSize: 10, color: MUTED }}>
            {filtered.length}件を表示（保存上限{MAX_HISTORY}件）
          </span>
          <button
            onClick={handleClearAll}
            disabled={entries.length === 0}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: entries.length === 0 ? MUTED : RED,
              border: `1.5px solid ${entries.length === 0 ? LINE : RED}`,
              borderRadius: 8,
              padding: "4px 10px",
              opacity: entries.length === 0 ? 0.6 : 1,
            }}
          >
            すべて削除
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* Storage URL から表示名を導出 (履歴の添付はURL文字列で保存されている) */
function attachName(u: string): string {
  try {
    return decodeURIComponent(u.split("/").pop() || u);
  } catch {
    return u;
  }
}

/* 履歴行の表示用: 名簿に居れば実物、削除済みなら履歴の情報から仮の姿を作る */
function expertOf(experts: Expert[], e: HistoryEntry): Expert {
  return (
    experts.find((x) => x.slug === e.expert_slug) || {
      id: e.expert_slug,
      slug: e.expert_slug,
      name: e.expert_name,
      specialty: e.specialty,
      prompt: "",
      coat: "bluegray",
      accessory: "none",
      isDefault: false,
      photoUrl: null,
      sortOrder: 999,
    }
  );
}
