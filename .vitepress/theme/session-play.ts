// Lesson 20.3's widget: a fuzz session played through the fuzzy trace's blocks 36 to 40. Each
// block goes as ImportBlock; the answer must be an Error where the trace refuses (its root
// after is its root before) and the trace's root otherwise. On the first wrong answer the
// fuzzer asks GetState for that block and stops. tools/widget-session-play.test.ts checks
// every root and hash against the lesson's run and the trace.

export const STEPS = [
  { n: 36, before: "0x2d49fb2147cf9fb1", after: "0xe9a2c0ff1d8c8995", hash: "0x82df38b84f05c946", error: "" },
  { n: 37, before: "0xe9a2c0ff1d8c8995", after: "0xe9a2c0ff1d8c8995", hash: "", error: "bad_code_hash" },
  { n: 38, before: "0xe9a2c0ff1d8c8995", after: "0xe9a2c0ff1d8c8995", hash: "", error: "bad_code_hash" },
  { n: 39, before: "0xe9a2c0ff1d8c8995", after: "0xe9a2c0ff1d8c8995", hash: "", error: "bad_code_hash" },
  { n: 40, before: "0xe9a2c0ff1d8c8995", after: "0x09189a2aeee2d2dc", hash: "0x4ba45dc92492be9b", error: "" },
];
export type Line = { n: number; sent: string; reply: string; ok: boolean; check: string };

/** The exchange, with the target answering a wrong root at block `wrongAt` (or never). */
export function play(wrongAt: number | null): Line[] {
  const out: Line[] = [];
  for (const s of STEPS) {
    const refused = s.after === s.before;
    const reply = refused ? `Error: ${s.error}` : s.n === wrongAt ? "StateRoot, but a wrong root" : `StateRoot ${s.after}…`;
    const ok = refused ? reply.startsWith("Error") : reply === `StateRoot ${s.after}…`;
    out.push({ n: s.n, sent: `ImportBlock ${s.n}`, reply, ok, check: refused ? "the trace refuses: an Error passes" : ok ? "= the trace's root" : `≠ the trace's ${s.after}…` });
    if (!ok) {
      out.push({ n: s.n, sent: `GetState ${s.hash}…`, reply: "State: the target's entries there", ok: false, check: "the fuzzer looks, and stops" });
      break;
    }
  }
  return out;
}
