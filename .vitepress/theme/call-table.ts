// Lesson 15.6's first widget: a call through the jump table, stepped. The program is the
// lesson's withCall: a load_imm_jump at 0 calls the function at 6, which doubles r2 and
// returns with jump_ind through r0; the halt address in r1 ends it at 4. The way back the
// call leaves in r0 is ν_X, and the reader picks it: 2 is right, the others go wrong the
// ways jumpIndirect says. tools/widget-call-table.test.ts checks it against 15.3 and 15.6.

export const HALT_ADDRESS = 2n ** 32n - 2n ** 16n;
/** withCall's jump table: address 2 leads to 4, address 4 to 6. */
export const JUMP_TABLE = [4, 6];
/** The basic blocks' starts: 0, and after each instruction that ends one. */
export const BLOCKS = new Set([0, 4, 6, 11]);

export interface Line { at: number; bytes: (wayBack: number) => number[]; says: string }
/** withCall, instruction by instruction, with the call's ν_X as the reader picks it. */
export const PROGRAM: Line[] = [
  { at: 0, bytes: (w) => [80, 0x10, w, 6], says: "load_imm_jump r0, ν_X, 6: r0 = the way back, then jump to 6" },
  { at: 4, bytes: () => [50, 0x01], says: "jump_ind r1 + 0: through r1, the halt address" },
  { at: 6, bytes: () => [200, 0x22, 0x02], says: "add_64 r2 = r2 + r2: the function doubles r2" },
  { at: 9, bytes: () => [50, 0x00], says: "jump_ind r0 + 0: return, through r0" },
];

export type Exit = "continue" | "halt" | "panic";
export interface State { pc: number; r: [bigint, bigint, bigint]; exit: Exit; steps: number }
export const start = (): State => ({ pc: 0, r: [0n, HALT_ADDRESS, 21n], exit: "continue", steps: 0 });

/** djump(a), as lesson 15.3's jumpIndirect: the halt address halts; 0, odd, or past the
 *  table panics; otherwise the table's entry a/2 − 1, which must start a basic block. */
export function jumpIndirect(a: bigint): { exit: Exit; to?: number; entry?: number; why: string } {
  if (a === HALT_ADDRESS) return { exit: "halt", why: "the halt address: the program is done" };
  if (a === 0n) return { exit: "panic", why: "address 0 is never in the table" };
  if (a % 2n !== 0n) return { exit: "panic", why: `${a} is odd, and table addresses are even: 2, 4, 6 and on` };
  if (a > BigInt(JUMP_TABLE.length * 2)) return { exit: "panic", why: `${a} is past the table's ${JUMP_TABLE.length} entries (addresses 2 to ${JUMP_TABLE.length * 2})` };
  const entry = Number(a / 2n) - 1;
  const to = JUMP_TABLE[entry];
  if (!BLOCKS.has(to)) return { exit: "panic", why: `entry ${entry} holds ${to}, which doesn't start a basic block` };
  return { exit: "continue", to, entry, why: `address ${a} is entry ${a}/2 − 1 = ${entry}, which holds byte ${to}` };
}

/** One step of withCall, from `s`, with the call writing `wayBack`; what happened, in words. */
export function step(s: State, wayBack: number): { next: State; said: string; entry?: number } {
  if (s.exit !== "continue") return { next: s, said: "" };
  const r: [bigint, bigint, bigint] = [...s.r];
  const at = (pc: number, exit: Exit = "continue") => ({ pc, r, exit, steps: s.steps + 1 });
  switch (s.pc) {
    case 0:
      r[0] = BigInt(wayBack);
      return { next: at(6), said: `The call: r0 = ${wayBack}, the way back, and jump to the function at 6.` };
    case 6:
      r[2] = (r[2] + r[2]) % 2n ** 64n;
      return { next: at(9), said: `The function: r2 = ${s.r[2]} + ${s.r[2]} = ${r[2]}.` };
    case 9:
    case 4: {
      const reg = s.pc === 9 ? 0 : 1;
      const j = jumpIndirect(r[reg]);
      const said = `jump_ind through r${reg} = ${r[reg] === HALT_ADDRESS ? "the halt address" : r[reg]}: ${j.why}.`;
      return { next: at(j.to ?? s.pc, j.exit), said, entry: j.entry };
    }
    default:
      return { next: at(s.pc, "panic"), said: "Not an instruction's start." };
  }
}

/** The ways back the reader can pick, and what each one shows. */
export const WAYS_BACK = [
  { value: 2, says: "2: entry 0, byte 4, just after the call" },
  { value: 4, says: "4: entry 1, the function itself" },
  { value: 3, says: "3: odd" },
  { value: 6, says: "6: past the table" },
];
/** Steps before the widget stops a run that never ends. */
export const MAX_STEPS = 12;
