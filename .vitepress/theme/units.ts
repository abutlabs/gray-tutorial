// Bits or bytes: which one a value written as code is, so the site colours it (custom.css,
// --unit-bits and --unit-bytes) and says how many. Bits are written as JavaScript writes
// them, 0b then the 0s and 1s (0b10000000; 0b1000_0000 in groups; 0b110xxxxx with any bit
// left as x); bytes in hex, 0x then two digits a byte (0x0102ff), or pairs with a space
// between (10 00 00 00). A lone pair is a byte only when it can't be a decimal number: a
// leading 0 or a letter (02, c7), not 12. A value cut short ends in … (0x00e5…). A prefix on
// its own, `0x` or `0b`, is no value. WRITING.md, Bits and bytes, has the rule.

export type Unit = "bits" | "bytes";
export interface Measured { unit: Unit; count: number; cut: boolean }

export function unitOf(code: string): Measured | undefined {
  const cut = /(…|\.\.\.)$/.test(code);
  const body = code.replace(/\s*(…|\.\.\.)$/, "");
  const bits = /^0b([01x_]+)$/.exec(body); // x: any bit, as in 0b110xxxxx
  if (bits) return { unit: "bits", count: bits[1].replaceAll("_", "").length, cut };
  const hex = /^0x((?:[0-9a-f]{2})+)$/.exec(body);
  if (hex) return { unit: "bytes", count: hex[1].length / 2, cut };
  if (/^[0-9a-f]{2}( [0-9a-f]{2})+$/.test(body) || (/^(0[0-9a-f]|[a-f][0-9a-f]|[0-9][a-f])$/.test(body) && body !== "0b")) {
    return { unit: "bytes", count: (body.length + 1) / 3, cut };
  }
  return undefined;
}

/** What a value is, in words, for its tooltip: "8 bits", "1 byte", "the first 4 bytes". */
export function sayUnit({ unit, count, cut }: Measured): string {
  const noun = count === 1 ? unit.slice(0, -1) : unit;
  return `${cut ? "the first " : ""}${count} ${noun}${cut ? " of more" : ""}`;
}

/** A widget's sentence cut into plain text and the bytes it writes after an arrow
 *  ("… first → 04 03 02 01"), so a template can show those as bytes. */
export function bytesAfterArrows(line: string): { text: string; bytes: boolean }[] {
  return line.split(/(?<=→ )([0-9a-f]{2}(?: (?:[0-9a-f]{2}|…))*)/).filter((text) => text !== "")
    .map((text) => ({ text, bytes: /^[0-9a-f]{2}( |$)/.test(text) }));
}
