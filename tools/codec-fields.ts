// A record's fields as a lesson's code writes them, for the widget tests that check a
// byte map's types against the client's codecs: codecFields("3.1", "WorkPackage") gives
// ["auth_code_host: u32", …].

import assert from "node:assert/strict";
import type { Type } from "../.vitepress/theme/codec-map.ts";
import { lessonCode } from "./lessons.ts";

export function codecFields(lesson: string, name: string): string[] {
  const m = new RegExp(`export const ${name} = record\\(\\{([\\s\\S]*?)\\n\\}\\);`).exec(lessonCode(lesson));
  assert.ok(m, `lesson ${lesson} defines ${name}`);
  return [...m[1].matchAll(/^\s+(\w+): (.+?),(?:\s*\/\/.*)?$/gm)].map(([, f, c]) => `${f}: ${c}`);
}

/** A widget type's fields the same way, naming nested records as the lessons do. */
export function typeFields(t: Type, names: Map<Type, string>): string[] {
  const codecOf = (t: Type): string =>
    names.get(t) ?? (typeof t === "string" ? t : "seq" in t ? `seq(${codecOf(t.seq)})` : JSON.stringify(t));
  return (t as { record: [string, Type][] }).record.map(([f, c]) => `${f}: ${codecOf(c)}`);
}

/** The lines of a lesson's decode trace after `npm run <script>`, "1..5  0.requester  0x04030201",
 *  with each path as a widget writes it. A trace of a list starts its paths with the item's
 *  index: `list` names the list ("preimages" gives preimages[0].requester), or, left out, the
 *  widget shows the first item itself and "0." is dropped. The list's own count is "length". */
export function traceLines(text: string, script: string, list?: string): { from: number; to: number; path: string; hex: string }[] {
  const at = text.indexOf(`npm run ${script}\n`);
  assert.ok(at >= 0, `the lesson runs ${script}`);
  const block = /```text\n([\s\S]*?)```/.exec(text.slice(at));
  assert.ok(block, `${script} shows its output`);
  const widgetPath = (raw: string) => {
    if (raw === "length") return list ?? "length";
    const [first, ...rest] = raw.split(".");
    const inner = rest.map((step) => (/^\d+$/.test(step) ? `[${step}]` : `.${step}`)).join("");
    return list ? `${list}[${first}]${inner}` : inner.replace(/^\./, "");
  };
  return [...block[1].matchAll(/^\s*(\d+)\.\.(\d+)\s+(\S+)\s+0x([0-9a-f]+)$/gm)].map(([, from, to, raw, hex]) => ({
    from: Number(from),
    to: Number(to),
    path: widgetPath(raw),
    hex,
  }));
}
