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
