// Lesson 4.7's widget: a whole block as the bytes hold it, the header then the five
// extrinsic parts in Appendix C's order, each as wide as its bytes, at both sizes. The
// layouts are what the lessons' own decoder (bin/decode.ts, lesson 2.7) reports for the
// codec vectors' block.bin: tools/widget-block-strip.test.ts checks them against that
// decoder where the vectors and a tangled client are at hand, and against the lesson's
// Output and prose always.

/** One part of a block: where its bytes are, how many fields the trace lists for it, how
 *  many items it holds where it's a list, and the first and last field the trace names. */
export type Part = { name: string; from: number; to: number; fields: number; items: number | null; first: string; last: string; says: string };
export type Layout = { size: "tiny" | "full"; total: number; fields: number; parts: Part[] };

const SAYS: Record<string, string> = {
  header: "the cover page: parent, state root, extrinsic hash, slot, the two marks, author, entropy source, offenders, seal (4.6)",
  tickets: "lottery entries, 784-byte ring proofs and all (4.1)",
  preimages: "data a service asked for, now delivered (4.1)",
  guarantees: "work-reports, each signed by its guarantors (4.3)",
  assurances: "one bitfield per validator: which cores' data it holds (4.2)",
  disputes: "verdicts, culprits and faults: the trial (4.4)",
};
const part = (name: string, from: number, to: number, fields: number, items: number | null, first: string, last: string): Part =>
  ({ name, from, to, fields, items, first, last, says: SAYS[name] });

/** codec/tiny/block.bin: 5,150 bytes, 145 fields. */
export const TINY: Layout = {
  size: "tiny", total: 5150, fields: 145,
  parts: [
    part("header", 0, 778, 26, null, "header.parent", "header.seal"),
    part("tickets", 778, 3134, 7, 3, "extrinsic.tickets.length", "extrinsic.tickets.2.signature"),
    part("preimages", 3134, 3198, 7, 3, "extrinsic.preimages.length", "extrinsic.preimages.2.blob"),
    part("guarantees", 3198, 3819, 47, 1, "extrinsic.guarantees.length", "extrinsic.guarantees.0.signatures.1.signature"),
    part("assurances", 3819, 4018, 9, 2, "extrinsic.assurances.length", "extrinsic.assurances.1.signature"),
    part("disputes", 4018, 5150, 49, null, "extrinsic.disputes.verdicts.length", "extrinsic.disputes.faults.0.signature"),
  ],
};
/** codec/full/block.bin: 161,177 bytes, 6,247 fields: a 1,023-validator epoch mark and two juries of 683. */
export const FULL: Layout = {
  size: "full", total: 161177, fields: 6247,
  parts: [
    part("header", 0, 65867, 2060, null, "header.parent", "header.seal"),
    part("tickets", 65867, 68223, 7, 3, "extrinsic.tickets.length", "extrinsic.tickets.2.signature"),
    part("preimages", 68223, 68287, 7, 3, "extrinsic.preimages.length", "extrinsic.preimages.2.blob"),
    part("guarantees", 68287, 68908, 47, 1, "extrinsic.guarantees.length", "extrinsic.guarantees.0.signatures.1.signature"),
    part("assurances", 68908, 69191, 9, 2, "extrinsic.assurances.length", "extrinsic.assurances.1.signature"),
    part("disputes", 69191, 161177, 4117, null, "extrinsic.disputes.verdicts.length", "extrinsic.disputes.faults.0.signature"),
  ],
};
export const LAYOUTS: Layout[] = [TINY, FULL];

/** Why a part is the size it is on full, where the lesson says so. */
export const WHY_FULL: Record<string, string> = {
  header: "most of it is the epoch mark: 1,023 validators' keys",
  disputes: "two juries of 683 votes each",
};

/** Bytes as a share of the whole, for a strip: at least a sliver, so every part can be tapped. */
export const share = (p: Part, layout: Layout): number => Math.max(0.02, (p.to - p.from) / layout.total);
/** The part a byte offset falls in. */
export const partAt = (layout: Layout, byte: number): Part | undefined => layout.parts.find((p) => p.from <= byte && byte < p.to);
