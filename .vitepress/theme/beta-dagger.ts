// Lesson 19.5's first widget: β and β†. Before storage_light block 1, β holds one block, its
// state root still zeros: nobody knew it until this block named it as parent_state_root. The
// block's one report is anchored on that parent, with that root. Checked against β it is
// bad_state_root; against β†, the newest root filled in, it passes.
// tools/widget-beta-dagger.test.ts checks every value against the trace.

export const PARENT = "0x245becfe7f091e38";
export const ZERO_ROOT = "0x" + "00".repeat(32);
export const PARENT_STATE_ROOT = "0xd6e78dc07a9ae915";
/** β before the block: one entry, the parent, its root not known yet. */
export const BETA = [{ header: PARENT, stateRoot: ZERO_ROOT }];
/** The block's one report's anchor: the parent, and the root it says the parent left. */
export const ANCHOR = { header: PARENT, stateRoot: PARENT_STATE_ROOT };
export const dagger = (beta: typeof BETA, parentStateRoot: string) =>
  beta.map((b, i) => (i === beta.length - 1 ? { ...b, stateRoot: parentStateRoot } : b));
/** §11's anchor check against a history: the anchor must be a block there, with that root. */
export function anchorCheck(history: typeof BETA): string | null {
  const block = history.find((b) => b.header === ANCHOR.header);
  if (!block) return "anchor_not_recent";
  return block.stateRoot === ANCHOR.stateRoot ? null : "bad_state_root";
}
