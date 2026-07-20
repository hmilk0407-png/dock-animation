import { COATS } from "@/lib/experts";
import { BLUE, NAVY } from "@/lib/theme";
import type { Accessory, Coat } from "@/lib/types";

/* ---------- フレブルSVGアバター (写真がないメンバー用) ----------
   working=true で耳パタパタ・タイピング・まばたきのアニメーション (CSS駆動) */
export default function Frenchie({
  coat = "white",
  accessory = "glasses",
  size = 48,
  working = false,
}: {
  coat?: Coat;
  accessory?: Accessory;
  size?: number;
  working?: boolean;
}) {
  const c = COATS[coat] || COATS.white;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={working ? "buhi-anim" : ""}
      style={{ display: "block", overflow: "visible" }}
    >
      {working && (
        <g>
          <rect x="31" y="66" width="38" height="20" rx="2.5" fill="#C6CDD8" stroke={NAVY} strokeWidth="2" />
          <rect x="34" y="69" width="32" height="14" rx="1.5" fill="#DCE8FA" />
          <path d="M26 86 L74 86 L70 93 L30 93 Z" fill="#AEB6C4" stroke={NAVY} strokeWidth="2" strokeLinejoin="round" />
        </g>
      )}

      <g className="buhiHead">
        <g className="earL">
          <path d="M21 42 Q10 9 29 6 Q45 4 45 28 Z" fill={c.base} stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M26 35 Q20 15 31 12 Q39 11 39 28 Z" fill="#F5B9C0" opacity="0.9" />
        </g>
        <g className="earR">
          <path d="M79 42 Q90 9 71 6 Q55 4 55 28 Z" fill={c.base} stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M74 35 Q80 15 69 12 Q61 11 61 28 Z" fill="#F5B9C0" opacity="0.9" />
        </g>
        <ellipse cx="50" cy="60" rx="32" ry="28" fill={c.base} stroke={NAVY} strokeWidth="2.5" />
        <ellipse cx="50" cy="72" rx="17" ry="12" fill={c.muzzle} />
        <path d="M41 41 Q50 36 59 41" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" opacity="0.35" />
        <path d="M43 46 Q50 42 57 46" fill="none" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" opacity="0.22" />
        <g className="eye">
          <circle cx="38" cy="55" r="4.2" fill="#1B2430" />
          <circle cx="39.4" cy="53.6" r="1.4" fill="#FFF" />
        </g>
        <g className="eye">
          <circle cx="62" cy="55" r="4.2" fill="#1B2430" />
          <circle cx="63.4" cy="53.6" r="1.4" fill="#FFF" />
        </g>
        <circle cx="29" cy="66" r="3.6" fill="#F5B9C0" opacity="0.55" />
        <circle cx="71" cy="66" r="3.6" fill="#F5B9C0" opacity="0.55" />
        <path d="M45.5 66 Q50 63.5 54.5 66 Q53 70.5 50 70.5 Q47 70.5 45.5 66 Z" fill="#1B2430" />
        <path d="M50 70.5 L50 75 M50 75 Q45.5 79.5 41.5 76 M50 75 Q54.5 79.5 58.5 76" fill="none" stroke="#1B2430" strokeWidth="2.2" strokeLinecap="round" />
        {accessory === "glasses" && (
          <g fill="none" stroke="#15181D" strokeWidth="3.4">
            <circle cx="38" cy="55" r="10.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="62" cy="55" r="10.5" fill="rgba(255,255,255,0.3)" />
            <path d="M48.5 54 Q50 51.5 51.5 54" />
            <path d="M27.5 53 L20 49" strokeWidth="2.6" />
            <path d="M72.5 53 L80 49" strokeWidth="2.6" />
          </g>
        )}
        {accessory === "ribbon" && (
          <g>
            <path d="M62 12 L74 4 L74 20 Z" fill={BLUE} stroke={NAVY} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M86 12 L74 4 L74 20 Z" fill={BLUE} stroke={NAVY} strokeWidth="2.2" strokeLinejoin="round" />
            <circle cx="74" cy="12" r="4" fill="#1A56C4" stroke={NAVY} strokeWidth="2" />
          </g>
        )}
        {accessory === "bowtie" && (
          <g>
            <path d="M36 85 L48 90 L36 95 Z" fill="#2A3750" stroke={NAVY} strokeWidth="2" strokeLinejoin="round" />
            <path d="M64 85 L52 90 L64 95 Z" fill="#2A3750" stroke={NAVY} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="50" cy="90" r="4" fill={BLUE} stroke={NAVY} strokeWidth="2" />
          </g>
        )}
        {accessory === "necktie" && (
          <g>
            <path d="M46 84 L54 84 L50 90 Z" fill={BLUE} stroke={NAVY} strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M47 89 L53 89 L51 99 L49 99 Z" fill={BLUE} stroke={NAVY} strokeWidth="1.8" strokeLinejoin="round" />
          </g>
        )}
        {accessory === "beret" && (
          <g>
            <path d="M26 24 Q50 4 74 24 Q60 30 50 29 Q40 30 26 24 Z" fill={BLUE} stroke={NAVY} strokeWidth="2.2" strokeLinejoin="round" />
            <circle cx="50" cy="10" r="3" fill={BLUE} stroke={NAVY} strokeWidth="2" />
          </g>
        )}
        {accessory === "scarf" && (
          <g>
            <path d="M32 84 Q50 93 68 84 L66 92 Q50 99 34 92 Z" fill="#7FA6E8" stroke={NAVY} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M60 89 L64 99 L56 97 Z" fill="#7FA6E8" stroke={NAVY} strokeWidth="2.2" strokeLinejoin="round" />
          </g>
        )}
      </g>

      {working && (
        <g>
          <g className="pawL">
            <rect x="34" y="83" width="11" height="9" rx="4.5" fill={c.base} stroke={NAVY} strokeWidth="2" />
            <path d="M38 84 L38 88 M41.5 84 L41.5 88" stroke={NAVY} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
          </g>
          <g className="pawR">
            <rect x="55" y="83" width="11" height="9" rx="4.5" fill={c.base} stroke={NAVY} strokeWidth="2" />
            <path d="M59 84 L59 88 M62.5 84 L62.5 88" stroke={NAVY} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
          </g>
        </g>
      )}
    </svg>
  );
}
