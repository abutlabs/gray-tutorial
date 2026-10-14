// Bits and bytes written as code in a lesson (`0b10000000`, `0x80`, `10 00 00 00`) take their
// unit's colour, and say how many in a tooltip. theme/units.ts tells them apart.

import type MarkdownIt from "markdown-it";
import { sayUnit, unitOf, WHOLE } from "./theme/units.ts";

export function unitCodes(md: MarkdownIt): void {
  md.core.ruler.push("unit-codes", (state) => {
    for (const token of state.tokens) {
      for (const child of token.children ?? []) {
        const measured = child.type === "code_inline" ? unitOf(child.content) : undefined;
        if (!measured) continue;
        child.attrJoin("class", child.content.length <= WHOLE ? `${measured.unit} whole` : measured.unit);
        child.attrSet("title", sayUnit(measured));
      }
    }
  });
}
