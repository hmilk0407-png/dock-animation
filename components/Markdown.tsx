import { CHIP, FIELD, LINE, MARU, TEXT } from "@/lib/theme";

/* ---------- 簡易Markdownレンダラー (v3移植) ---------- */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let mch: RegExpExecArray | null;
  let n = 0;
  while ((mch = re.exec(text)) !== null) {
    if (mch.index > last) out.push(text.slice(last, mch.index));
    const t = mch[0];
    if (t.startsWith("**")) {
      out.push(<b key={`${keyBase}-b${n++}`}>{t.slice(2, -2)}</b>);
    } else {
      out.push(
        <code
          key={`${keyBase}-c${n++}`}
          style={{
            background: FIELD,
            border: `1px solid ${LINE}`,
            borderRadius: 4,
            padding: "0 4px",
            fontSize: "0.92em",
          }}
        >
          {t.slice(1, -1)}
        </code>
      );
    }
    last = mch.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text }: { text: string }) {
  const lines = String(text || "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre
          key={key++}
          style={{
            background: "#F1EFE7",
            border: `1px solid ${LINE}`,
            color: TEXT,
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            overflowX: "auto",
            margin: "8px 0",
            whiteSpace: "pre",
          }}
        >
          {buf.join("\n")}
        </pre>
      );
      continue;
    }

    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:\-|]+\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const parseRow = (l: string) =>
        l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const header = parseRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} style={{ overflowX: "auto", margin: "8px 0" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {header.map((h, hi) => (
                  <th
                    key={hi}
                    style={{
                      border: `1px solid ${LINE}`,
                      background: CHIP,
                      color: TEXT,
                      padding: "6px 10px",
                      fontWeight: 700,
                      textAlign: "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {renderInline(h, `h${key}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      style={{ border: `1px solid ${LINE}`, padding: "6px 10px", verticalAlign: "top" }}
                    >
                      {renderInline(c, `t${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const hm = line.match(/^(#{1,4})\s+(.*)/);
    if (hm) {
      const sizes: Record<number, number> = { 1: 17, 2: 16, 3: 14.5, 4: 13.5 };
      blocks.push(
        <div
          key={key++}
          style={{
            fontWeight: 900,
            fontSize: sizes[hm[1].length] || 14,
            margin: "10px 0 4px",
            color: TEXT,
            fontFamily: MARU,
          }}
        >
          {renderInline(hm[2], `hd${key}`)}
        </div>
      );
      i++;
      continue;
    }

    if (/^\s*(-{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(
        <hr key={key++} style={{ border: "none", borderTop: `1px solid ${LINE}`, margin: "10px 0" }} />
      );
      i++;
      continue;
    }

    if (/^\s*([-*・]|\d+[.．)])\s+/.test(line)) {
      const items: { marker: string; body: string }[] = [];
      while (i < lines.length && /^\s*([-*・]|\d+[.．)])\s+/.test(lines[i])) {
        const lm = lines[i].match(/^\s*([-*・]|\d+[.．)])\s+(.*)/)!;
        items.push({ marker: /\d/.test(lm[1]) ? lm[1] : "・", body: lm[2] });
        i++;
      }
      blocks.push(
        <div key={key++} style={{ margin: "4px 0" }}>
          {items.map((it, ii) => (
            <div key={ii} style={{ display: "flex", gap: 6, margin: "2px 0" }}>
              <span style={{ color: "#2E5FD8", fontWeight: 700, flexShrink: 0 }}>{it.marker}</span>
              <span>{renderInline(it.body, `li${key}-${ii}`)}</span>
            </div>
          ))}
        </div>
      );
      continue;
    }

    if (line.trim() === "") {
      blocks.push(<div key={key++} style={{ height: 8 }} />);
      i++;
      continue;
    }

    blocks.push(
      <div key={key++} style={{ whiteSpace: "pre-wrap" }}>
        {renderInline(line, `p${key}`)}
      </div>
    );
    i++;
  }

  return <div>{blocks}</div>;
}
