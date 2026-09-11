/**
 * BUHI WORKS — Google ドキュメント出力 (Apps Script Web アプリ)
 *
 * 【設定】
 *  1. script.google.com で新規プロジェクト → このコードを貼る
 *  2. プロジェクトの設定 → スクリプト プロパティ に追加:
 *       SECRET     : 任意の長いランダム文字列 (Vercel の GDOC_SECRET と同じ値)
 *       FOLDER_ID  : (任意) 保存先 Drive フォルダの ID。未設定ならマイドライブ直下
 *  3. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *       実行ユーザー: 自分 / アクセスできるユーザー: 全員
 *     → 表示された URL (末尾 /exec) を Vercel の GDOC_SCRIPT_URL に設定
 *  4. コードを変えたら「デプロイを管理 → 編集 → 新バージョン」で更新 (URL は変わらない)
 *
 * 【入力】 POST JSON { secret, title, markdown }
 * 【出力】 JSON { url, id } または { error }
 */

function doPost(e) {
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var expected = PropertiesService.getScriptProperties().getProperty("SECRET") || "";
    if (!expected || body.secret !== expected) {
      return out.setContent(JSON.stringify({ error: "unauthorized" }));
    }
    var title = String(body.title || "BUHI WORKS 出力").slice(0, 120);
    var markdown = String(body.markdown || "");
    if (!markdown.trim()) return out.setContent(JSON.stringify({ error: "本文が空です" }));

    var doc = DocumentApp.create(title);
    renderMarkdown_(doc.getBody(), markdown);
    doc.saveAndClose();

    var folderId = PropertiesService.getScriptProperties().getProperty("FOLDER_ID");
    if (folderId) {
      var file = DriveApp.getFileById(doc.getId());
      DriveApp.getFolderById(folderId).addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }
    return out.setContent(JSON.stringify({ url: doc.getUrl(), id: doc.getId() }));
  } catch (err) {
    return out.setContent(JSON.stringify({ error: String(err && err.message || err) }));
  }
}

/** 動作確認用: エディタから実行するとマイドライブにテスト文書ができる */
function testRender() {
  var doc = DocumentApp.create("BUHI WORKS テスト");
  renderMarkdown_(doc.getBody(),
    "# 見出し1\n\n本文です。**太字**と`コード`。\n\n## 見出し2\n\n- 箇条書きA\n- 箇条書きB\n\n1. 番号付き\n2. 番号付き\n\n| 項目 | 金額 |\n|---|---|\n| A | 100 |\n| B | 200 |\n\n```\ncode block\n```\n");
  Logger.log(doc.getUrl());
}

/* ---------------- Markdown → Docs 変換 (見出し/段落/箇条書き/番号/太字/コード/表) ---------------- */

function renderMarkdown_(body, md) {
  // DocumentApp.create() は空段落を1つ持つので消す
  var first = body.getChild(0);
  var lines = md.replace(/\r\n?/g, "\n").split("\n");
  var i = 0;
  var pending = []; // 連続する通常行を1段落にまとめる
  var lastList = null; // {type:'bullet'|'number', id}

  function flushPara() {
    if (pending.length === 0) return;
    var p = body.appendParagraph("");
    appendInline_(p, pending.join(" "));
    pending = [];
  }

  while (i < lines.length) {
    var line = lines[i];

    // コードブロック
    if (/^```/.test(line)) {
      flushPara();
      var code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++;
      var cp = body.appendParagraph(code.join("\n"));
      cp.editAsText().setFontFamily("Courier New").setFontSize(9);
      cp.setIndentStart(18);
      lastList = null;
      continue;
    }

    // 表 (| a | b | 形式。2行目が区切り線)
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flushPara();
      var rows = [];
      rows.push(splitRow_(line));
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(splitRow_(lines[i])); i++; }
      var cols = rows[0].length;
      var cells = rows.map(function (r) {
        while (r.length < cols) r.push("");
        return r.slice(0, cols).map(function (c) { return c.replace(/\*\*/g, ""); });
      });
      var table = body.appendTable(cells);
      for (var c = 0; c < cols; c++) {
        table.getRow(0).getCell(c).editAsText().setBold(true);
      }
      lastList = null;
      continue;
    }

    // 見出し
    var h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushPara();
      var hp = body.appendParagraph("");
      appendInline_(hp, h[2].replace(/\*\*/g, ""));
      hp.setHeading([DocumentApp.ParagraphHeading.HEADING1, DocumentApp.ParagraphHeading.HEADING2,
        DocumentApp.ParagraphHeading.HEADING3, DocumentApp.ParagraphHeading.HEADING4][h[1].length - 1]);
      lastList = null;
      i++;
      continue;
    }

    // 箇条書き / 番号付き (先頭スペースでネスト)
    var li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      flushPara();
      var isNum = /\d/.test(li[2]);
      var level = Math.min(3, Math.floor(li[1].replace(/\t/g, "  ").length / 2));
      var item = body.appendListItem("");
      appendInline_(item, li[3]);
      item.setNestingLevel(level);
      item.setGlyphType(isNum ? DocumentApp.GlyphType.NUMBER : DocumentApp.GlyphType.BULLET);
      // 直前のリストと同じ種類なら同じリストIDに連結 (番号が続く)
      var type = isNum ? "number" : "bullet";
      if (lastList && lastList.type === type) item.setListId(lastList.item);
      lastList = { type: type, item: item };
      i++;
      continue;
    }

    // 水平線
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushPara();
      body.appendHorizontalRule();
      lastList = null;
      i++;
      continue;
    }

    // 引用
    var q = line.match(/^>\s?(.*)$/);
    if (q) {
      flushPara();
      var qp = body.appendParagraph("");
      appendInline_(qp, q[1]);
      qp.setIndentStart(24).editAsText().setItalic(true);
      lastList = null;
      i++;
      continue;
    }

    // 空行 = 段落区切り
    if (!line.trim()) {
      flushPara();
      lastList = null;
      i++;
      continue;
    }

    pending.push(line.trim());
    i++;
  }
  flushPara();
  if (first && first.getType() === DocumentApp.ElementType.PARAGRAPH && !first.asParagraph().getText()) {
    try { body.removeChild(first); } catch (e) {}
  }
}

function splitRow_(line) {
  var s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return s.split("|").map(function (c) { return c.trim(); });
}

/** 段落/リスト項目に **太字** と `コード` を反映しながら文字列を追加 */
function appendInline_(el, text) {
  var t = el.editAsText();
  var re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  var last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) t.appendText(text.slice(last, m.index));
    var token = m[0];
    var start = t.getText().length;
    if (token.charAt(0) === "`") {
      t.appendText(token.slice(1, -1));
      t.setFontFamily(start, t.getText().length - 1, "Courier New");
    } else {
      t.appendText(token.slice(2, -2));
      t.setBold(start, t.getText().length - 1, true);
    }
    last = m.index + token.length;
  }
  if (last < text.length) t.appendText(text.slice(last));
}
