"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { BG, BLUE, CARD, FIELD, LINE, MARU, MUTED, TEXT } from "@/lib/theme";

/* ---------- ログイン (メールのマジックリンク + Google) ----------
   受付のフレブルが出迎える小さなエントランス。 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function sendMagicLink() {
    if (!email.trim() || status === "sending") return;
    setStatus("sending");
    setErrMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setErrMsg(e instanceof Error ? e.message : "送信に失敗しました");
    }
  }

  async function signInWithGoogle() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (e) {
      setStatus("error");
      setErrMsg(
        e instanceof Error
          ? `Googleログインに失敗しました: ${e.message}`
          : "Googleログインに失敗しました"
      );
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: BG,
        backgroundImage: "radial-gradient(#26303C 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        color: TEXT,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center"
        style={{ background: CARD, border: `1px solid ${LINE}`, boxShadow: "0 8px 30px rgba(0,0,0,0.45)" }}
      >
        <div
          className="flex items-stretch mb-4"
          style={{ fontWeight: 900, fontSize: 14, fontStyle: "italic", letterSpacing: 1, fontFamily: MARU }}
        >
          <span style={{ background: BLUE, color: "#FFF", padding: "2px 8px" }}>BUHI</span>
          <span style={{ background: "transparent", color: TEXT, padding: "2px 8px", border: `2px solid ${TEXT}` }}>
            WORKS
          </span>
        </div>

        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              overflow: "hidden",
              border: `2px solid ${LINE}`,
              boxShadow: "0 0 0 4px rgba(59,123,246,0.18)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/milk/photo/idle.jpg" alt="ミルク" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </motion.div>

        <div style={{ fontSize: 16, fontWeight: 900, fontFamily: MARU, marginTop: 8 }}>
          おかえりなさいませ
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4, textAlign: "center", lineHeight: 1.7 }}>
          受付のミルクです。メールアドレスにログイン用のリンクをお送りします。
        </div>

        {status === "sent" ? (
          <div
            className="w-full mt-5 px-4 py-3 rounded-xl text-center"
            style={{ background: "#22362C", border: "1px solid #2F5A3F", fontSize: 13, lineHeight: 1.7 }}
          >
            📮 <b>{email}</b> にリンクを送りました。
            <br />
            メール内のリンクを開くとログインできます。
          </div>
        ) : (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMagicLink();
              }}
              type="email"
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-lg mt-5 outline-none"
              style={{ background: FIELD, border: `1px solid ${LINE}`, fontSize: 14, fontFamily: "inherit" }}
            />
            <button
              onClick={sendMagicLink}
              disabled={!email.trim() || status === "sending"}
              className="w-full py-2.5 rounded-lg mt-2"
              style={{
                background: !email.trim() || status === "sending" ? "#2C3541" : BLUE,
                color: !email.trim() || status === "sending" ? "#6F7C8F" : "#FFF",
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              {status === "sending" ? "送信中…" : "ログインリンクを送る"}
            </button>

            <div className="flex items-center w-full my-3 gap-2">
              <div style={{ flex: 1, height: 1, background: LINE }} />
              <span style={{ fontSize: 11, color: MUTED }}>または</span>
              <div style={{ flex: 1, height: 1, background: LINE }} />
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full py-2.5 rounded-lg"
              style={{ background: CARD, border: `1px solid ${LINE}`, fontWeight: 700, fontSize: 13 }}
            >
              Googleでログイン
            </button>
          </>
        )}

        {status === "error" && (
          <div className="w-full mt-3 px-3 py-2 rounded-lg" style={{ background: "#3A2A2C", border: "1px solid #6B3B3B", color: "#FFB4AE", fontSize: 12 }}>
            {errMsg}
          </div>
        )}

        <div style={{ fontSize: 10, color: MUTED, marginTop: 16, textAlign: "center", lineHeight: 1.7 }}>
          履歴・専門家設定はあなたのアカウントに紐づいてクラウド保存され、
          <br />
          スマホ・PCどちらからでも同じオフィスに出社できます。
        </div>
      </motion.div>
    </div>
  );
}
