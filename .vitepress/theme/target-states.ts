// Lesson 20.2's first widget: the states a target keeps. Each is kept under its block's
// header hash; ImportBlock imports onto whichever kept state its parent names; a refused
// block keeps nothing; a block whose parent never came is an Error; a second Initialize
// closes the session; the session's features are both sides' ANDed. The hashes and roots are
// the storage trace's genesis and blocks 1 and 2. tools/widget-target-states.test.ts checks them.

export const FEATURES = 1 | 2;
export const GENESIS = { hash: "0x245becfe7f091e38", root: "0xd6e78dc07a9ae915" };
export const BLOCKS = [
  { n: 1, parent: GENESIS.hash, hash: "0x5592b088d8760232", root: "0x48dc323d05aa152a" },
  { n: 2, parent: "0x5592b088d8760232", hash: "0x88502d3d3a62d26c", root: "0xd5ca7716c78bd4bc" },
];
export type Kept = { hash: string; label: string; ancestry: number };
export type Session = { features: number | null; initialized: boolean; closed: boolean; kept: Kept[] };
export const start = (): Session => ({ features: null, initialized: false, closed: false, kept: [] });

export const MESSAGES = [
  { id: "peer1", label: "PeerInfo, features 1" },
  { id: "peer3", label: "PeerInfo, features 3" },
  { id: "init", label: "Initialize: genesis" },
  { id: "b1bad", label: "block 1, its extrinsic changed" },
  { id: "b1", label: "block 1" },
  { id: "b2", label: "block 2" },
  { id: "b5", label: "a block whose parent never came" },
] as const;
export type MessageId = (typeof MESSAGES)[number]["id"];

/** The target's answer to one message, and the session after. */
export function answer(s: Session, id: MessageId): { session: Session; reply: string } {
  if (s.closed) return { session: s, reply: "the connection is closed" };
  const keep = (k: Kept) => ({ ...s, kept: [...s.kept, k] });
  const has = (hash: string) => s.kept.find((k) => k.hash === hash);
  if (id === "peer1" || id === "peer3") {
    const offered = id === "peer1" ? 1 : 3;
    return { session: { ...s, features: offered & FEATURES }, reply: `PeerInfo back; the session's features: ${offered} AND ${FEATURES} = ${offered & FEATURES}` };
  }
  if (id === "init") {
    if (s.initialized) return { session: { ...s, closed: true }, reply: "a second Initialize: the target closes the connection" };
    return { session: { ...keep({ hash: GENESIS.hash, label: "genesis", ancestry: 1 }), initialized: true }, reply: `StateRoot ${GENESIS.root}…` };
  }
  if (id === "b5") return { session: s, reply: 'Error: "the parent block is unknown"' };
  if (id === "b1bad") {
    if (!has(GENESIS.hash)) return { session: s, reply: 'Error: "the parent block is unknown"' };
    return { session: s, reply: "Error: bad_extrinsic_hash. Nothing kept; genesis can still take the real block 1: a fork one block deep" };
  }
  const b = BLOCKS[id === "b1" ? 0 : 1];
  const parent = has(b.parent);
  if (!parent) return { session: s, reply: 'Error: "the parent block is unknown"' };
  if (has(b.hash)) return { session: s, reply: `StateRoot ${b.root}…, again` };
  return { session: keep({ hash: b.hash, label: `block ${b.n}`, ancestry: parent.ancestry + 1 }), reply: `StateRoot ${b.root}…, the trace's` };
}
