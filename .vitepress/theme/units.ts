// Bits or bytes: which one a value written as code is, so the site colours it (custom.css,
// --unit-bits and --unit-bytes) and says how many. Bits are written as JavaScript writes
// them, 0b then the 0s and 1s (0b10000000; 0b1000_0000 in groups; 0b110xxxxx with any bit
// left as x); bytes in hex, 0x then two digits a byte (0x0102ff), or pairs with a space
// between (10 00 00 00), a long one with its middle left out (70 a5 … 2e, 0x70a5…532e). A
// lone pair is a byte only when it can't be a decimal number: a leading 0 or a letter (02,
// c7), not 12. A value cut short ends in … (0x00e5…). A prefix on its own, `0x` or `0b`, is
// no value. WRITING.md, Bits and bytes, has the rule.

export type Unit = "bits" | "bytes";

/** The longest value kept on one line: "10 00 00 00" never breaks, a u64's 64 bits may. */
export const WHOLE = 32;
export interface Measured { unit: Unit; count: number; cut: boolean; middle?: boolean }

export function unitOf(code: string): Measured | undefined {
  const cut = /(…|\.\.\.)$/.test(code);
  const body = code.replace(/\s*(…|\.\.\.)$/, "");
  const bits = /^0b([01x_]+)$/.exec(body); // x: any bit, as in 0b110xxxxx
  if (bits) return { unit: "bits", count: bits[1].replaceAll("_", "").length, cut };
  const hex = /^0x((?:[0-9a-f]{2})+)$/.exec(body);
  if (hex) return { unit: "bytes", count: hex[1].length / 2, cut };
  const ends = /^0x((?:[0-9a-f]{2})+)…((?:[0-9a-f]{2})+)$/.exec(body); // 0x70a5…532e
  if (ends) return { unit: "bytes", count: (ends[1].length + ends[2].length) / 2, cut: true, middle: true };
  if (/^[0-9a-f]{2}( [0-9a-f]{2})* … [0-9a-f]{2}( [0-9a-f]{2})*$/.test(body)) { // a hash cut in its middle
    return { unit: "bytes", count: body.split(" ").length - 1, cut: true, middle: true };
  }
  if (/^[0-9a-f]{2}( [0-9a-f]{2})+$/.test(body) || (/^(0[0-9a-f]|[a-f][0-9a-f]|[0-9][a-f])$/.test(body) && body !== "0b")) {
    return { unit: "bytes", count: (body.length + 1) / 3, cut };
  }
  return undefined;
}

/** What a value is, in words, for its tooltip: "8 bits", "1 byte", "the first 2 bytes of more",
 *  "7 of its bytes shown". */
export function sayUnit({ unit, count, cut, middle }: Measured): string {
  const noun = count === 1 ? unit.slice(0, -1) : unit;
  if (middle) return `${count} of its ${unit} shown`;
  return `${cut ? "the first " : ""}${count} ${noun}${cut ? " of more" : ""}`;
}

/** A widget's sentence cut into plain text and the bits and bytes in it, so UnitText.vue can
 *  show each in its unit's colour: 0b…, 0x… (whole bytes), runs of hex pairs ("01 00 00 00"),
 *  and a lone pair only when it can't be a word or a decimal number (07, c7, 2a, ff; not 12,
 *  be or 0b). A … right after a value goes with it. */
export function unitParts(line: string): { text: string; unit?: Unit }[] {
  const VALUE = /(?<![\w.])(0b[01x_]*[01][01x_]*|0x(?:[0-9a-f]{2})+(?:…(?:[0-9a-f]{2})+)?|[0-9a-f]{2}(?: (?:[0-9a-f]{2}|…))+|0[0-9a-ac-f]|[1-9][a-f]|[a-f][0-9]|ff)(?: ?…)?(?![\w])/g;
  const parts: { text: string; unit?: Unit }[] = [];
  let at = 0;
  for (const m of line.matchAll(VALUE)) {
    if (m.index > at) parts.push({ text: line.slice(at, m.index) });
    parts.push({ text: m[0], unit: m[0].startsWith("0b") ? "bits" : "bytes" });
    at = m.index + m[0].length;
  }
  if (at < line.length) parts.push({ text: line.slice(at) });
  return parts;
}
