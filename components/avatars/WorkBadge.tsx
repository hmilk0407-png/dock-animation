import { BLUE, LINE, NAVY, RED, WOOD } from "@/lib/theme";

/* ---------- 役割別ワークバッジ (作業中オーバーレイ) ----------
   担当者のアバター右下に出る「いま何をしているか」のミニアニメーション (CSS駆動) */
export default function WorkBadge({ slug, size = 26 }: { slug: string; size?: number }) {
  const kind =
    (
      {
        secretary: "scan",
        assign: "swap",
        estimate: "stamp",
        labor: "book",
        reward: "chart",
        editing: "pen",
        management: "beam",
      } as Record<string, string>
    )[slug] || "gear";

  let icon: React.ReactNode = null;
  if (kind === "scan") {
    /* ミルク: 依頼書をスキャンして読む */
    icon = (
      <svg width={size - 8} height={size - 8} viewBox="0 0 20 20">
        <rect x="4" y="2.5" width="12" height="15" rx="1.5" fill="#FFF" stroke={NAVY} strokeWidth="1.3" />
        <path d="M6.5 6.5h7M6.5 9.5h7M6.5 12.5h4.5" stroke="#B9C4D6" strokeWidth="1.1" strokeLinecap="round" />
        <rect className="ov-scan" x="4.8" y="3.4" width="10.4" height="2.4" rx="1" fill={BLUE} opacity="0.5" />
      </svg>
    );
  } else if (kind === "swap") {
    /* ソラ: メンバーカードを並べ替えてアサイン検討 */
    icon = (
      <svg width={size - 8} height={size - 8} viewBox="0 0 20 20">
        <rect className="ov-swapA" x="2.6" y="5.5" width="6" height="9" rx="1.2" fill={BLUE} />
        <rect className="ov-swapB" x="11.4" y="5.5" width="6" height="9" rx="1.2" fill={NAVY} />
      </svg>
    );
  } else if (kind === "stamp") {
    /* モカ: 見積書に承認印をポンッ */
    icon = (
      <svg width={size - 8} height={size - 8} viewBox="0 0 20 20">
        <rect x="3.5" y="12.5" width="13" height="5" rx="1" fill="#FFF" stroke={NAVY} strokeWidth="1.2" />
        <circle className="ov-ink" cx="10" cy="15" r="1.8" fill={RED} />
        <g className="ov-stamp">
          <rect x="8.4" y="1.5" width="3.2" height="4.5" rx="1" fill={NAVY} />
          <rect x="6.4" y="5.6" width="7.2" height="2.6" rx="0.8" fill={BLUE} />
        </g>
      </svg>
    );
  } else if (kind === "book") {
    /* ハナ: 就業規則・法令集のページをめくる */
    icon = (
      <svg width={size - 8} height={size - 8} viewBox="0 0 20 20">
        <path d="M2.8 5.6 Q10 3 17.2 5.6 L17.2 15.2 Q10 12.6 2.8 15.2 Z" fill="#FFF" stroke={NAVY} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M10 4.4 L10 13.4" stroke={NAVY} strokeWidth="1" />
        <path className="ov-page" d="M10 4.4 Q14.2 3.2 17.2 5.6 L17.2 15.2 Q13.4 12.9 10 13.4 Z" fill="#DCE8FA" stroke={BLUE} strokeWidth="0.8" />
      </svg>
    );
  } else if (kind === "chart") {
    /* ゴマ: 報酬グラフの棒が伸び縮み */
    icon = (
      <svg width={size - 8} height={size - 8} viewBox="0 0 20 20">
        <path d="M3 17h14" stroke={NAVY} strokeWidth="1.2" strokeLinecap="round" />
        <rect className="ov-bar" style={{ animationDelay: "0s" }} x="4" y="7" width="3.4" height="9.5" rx="0.8" fill={BLUE} />
        <rect className="ov-bar" style={{ animationDelay: "0.18s" }} x="8.3" y="4.5" width="3.4" height="12" rx="0.8" fill={NAVY} />
        <rect className="ov-bar" style={{ animationDelay: "0.36s" }} x="12.6" y="9" width="3.4" height="7.5" rx="0.8" fill={WOOD} />
      </svg>
    );
  } else if (kind === "pen") {
    /* ユズ: 赤ペンで校正線をスーッと引く */
    icon = (
      <svg width={size - 8} height={size - 8} viewBox="0 0 20 20">
        <path className="ov-pen" d="M2.8 14.5 Q5.5 11.5 7.5 13.5 T12 13 T17 12" fill="none" stroke={RED} strokeWidth="1.7" strokeLinecap="round" />
        <g transform="rotate(38 14 6)">
          <rect x="12.6" y="2.2" width="2.8" height="7" rx="1" fill={NAVY} />
          <path d="M14 9.2 L14.9 11.2 L13.1 11.2 Z" fill={RED} />
        </g>
      </svg>
    );
  } else if (kind === "beam") {
    /* ブン: 天秤で判断材料を比較検討 */
    icon = (
      <svg width={size - 8} height={size - 8} viewBox="0 0 20 20">
        <path d="M10 6.2 L10 14.5 M6 15.8 L14 15.8" stroke={NAVY} strokeWidth="1.4" strokeLinecap="round" />
        <g className="ov-beam">
          <path d="M3.6 6.2 L16.4 6.2" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M3.6 6.2 L3.6 8.6 M16.4 6.2 L16.4 8.6" stroke={NAVY} strokeWidth="1" />
          <circle cx="3.6" cy="10.2" r="1.9" fill={BLUE} />
          <circle cx="16.4" cy="10.2" r="1.9" fill={WOOD} />
        </g>
        <circle cx="10" cy="6.2" r="1.3" fill={NAVY} />
      </svg>
    );
  } else {
    /* カスタム専門家: 歯車が回る */
    icon = (
      <svg width={size - 8} height={size - 8} viewBox="0 0 20 20">
        <g className="ov-gear">
          <circle cx="10" cy="10" r="4.6" fill="none" stroke={NAVY} strokeWidth="1.6" />
          <path
            d="M10 3.2 L10 5.4 M10 14.6 L10 16.8 M3.2 10 L5.4 10 M14.6 10 L16.8 10 M5.2 5.2 L6.7 6.7 M13.3 13.3 L14.8 14.8 M14.8 5.2 L13.3 6.7 M6.7 13.3 L5.2 14.8"
            stroke={NAVY}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
        <circle cx="10" cy="10" r="1.6" fill={BLUE} />
      </svg>
    );
  }

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        right: -5,
        bottom: -5,
        width: size,
        height: size,
        background: "#FFF",
        border: `1.5px solid ${LINE}`,
        borderRadius: "50%",
        boxShadow: "0 2px 6px rgba(20,38,62,0.18)",
      }}
    >
      {icon}
    </div>
  );
}
