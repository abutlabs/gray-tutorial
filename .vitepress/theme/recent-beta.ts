// β before blocks 50 to 53 of the tiny preimages trace, read from each trace step's C(3) (the
// vectors' values, each hash shortened to its first four bytes), with what each block brings:
// lesson 9.2's three steps, block after block. recent-blocks.ts replays them;
// tools/widget-recent-blocks.test.ts checks them against the vectors where vectors/ is
// downloaded.

export type Remembered = { slot: number; header_hash: string; beefy_root: string; state_root: string; reported: number };
export type Beta = { history: Remembered[]; belt: (string | null)[] };
export type Step = { n: number; before: Beta; block: { slot: number; parent_state_root: string; reported: number } };
export const STEPS: Step[] = [
  {
    n: 50,
    before: {
      history: [
        {
          slot: 42,
          header_hash: "0x8492038c…",
          beefy_root: "0xd33299c9…",
          state_root: "0x85e2f9da…",
          reported: 0
        },
        {
          slot: 43,
          header_hash: "0x083e87af…",
          beefy_root: "0xf25da2b7…",
          state_root: "0x92b349ae…",
          reported: 0
        },
        {
          slot: 44,
          header_hash: "0x0193a9f8…",
          beefy_root: "0xddaed19c…",
          state_root: "0xf3d9561f…",
          reported: 2
        },
        {
          slot: 45,
          header_hash: "0xdf827752…",
          beefy_root: "0x8e61f98d…",
          state_root: "0x1e90a7be…",
          reported: 1
        },
        {
          slot: 46,
          header_hash: "0xb3711eed…",
          beefy_root: "0xbede1624…",
          state_root: "0xa61f6f99…",
          reported: 0
        },
        {
          slot: 47,
          header_hash: "0x12d04d3e…",
          beefy_root: "0x524e191c…",
          state_root: "0x2f529bd8…",
          reported: 1
        },
        {
          slot: 48,
          header_hash: "0x1beca774…",
          beefy_root: "0xebfeb74b…",
          state_root: "0xd095c60f…",
          reported: 1
        },
        {
          slot: 49,
          header_hash: "0x7c7ee195…",
          beefy_root: "0x41063bd0…",
          state_root: "0x00000000…",
          reported: 1
        }
      ],
      belt: [
        "0x00000000…",
        null,
        null,
        null,
        "0xe58769b3…",
        "0x0eb01ebf…"
      ]
    },
    block: {
      slot: 50,
      parent_state_root: "0x5ee4b142…",
      reported: 2
    }
  },
  {
    n: 51,
    before: {
      history: [
        {
          slot: 43,
          header_hash: "0x083e87af…",
          beefy_root: "0xf25da2b7…",
          state_root: "0x92b349ae…",
          reported: 0
        },
        {
          slot: 44,
          header_hash: "0x0193a9f8…",
          beefy_root: "0xddaed19c…",
          state_root: "0xf3d9561f…",
          reported: 2
        },
        {
          slot: 45,
          header_hash: "0xdf827752…",
          beefy_root: "0x8e61f98d…",
          state_root: "0x1e90a7be…",
          reported: 1
        },
        {
          slot: 46,
          header_hash: "0xb3711eed…",
          beefy_root: "0xbede1624…",
          state_root: "0xa61f6f99…",
          reported: 0
        },
        {
          slot: 47,
          header_hash: "0x12d04d3e…",
          beefy_root: "0x524e191c…",
          state_root: "0x2f529bd8…",
          reported: 1
        },
        {
          slot: 48,
          header_hash: "0x1beca774…",
          beefy_root: "0xebfeb74b…",
          state_root: "0xd095c60f…",
          reported: 1
        },
        {
          slot: 49,
          header_hash: "0x7c7ee195…",
          beefy_root: "0x41063bd0…",
          state_root: "0x5ee4b142…",
          reported: 1
        },
        {
          slot: 50,
          header_hash: "0xd72b6d61…",
          beefy_root: "0x84455b22…",
          state_root: "0x00000000…",
          reported: 2
        }
      ],
      belt: [
        null,
        "0xad3228b6…",
        null,
        null,
        "0xe58769b3…",
        "0x0eb01ebf…"
      ]
    },
    block: {
      slot: 51,
      parent_state_root: "0xec88ce8e…",
      reported: 1
    }
  },
  {
    n: 52,
    before: {
      history: [
        {
          slot: 44,
          header_hash: "0x0193a9f8…",
          beefy_root: "0xddaed19c…",
          state_root: "0xf3d9561f…",
          reported: 2
        },
        {
          slot: 45,
          header_hash: "0xdf827752…",
          beefy_root: "0x8e61f98d…",
          state_root: "0x1e90a7be…",
          reported: 1
        },
        {
          slot: 46,
          header_hash: "0xb3711eed…",
          beefy_root: "0xbede1624…",
          state_root: "0xa61f6f99…",
          reported: 0
        },
        {
          slot: 47,
          header_hash: "0x12d04d3e…",
          beefy_root: "0x524e191c…",
          state_root: "0x2f529bd8…",
          reported: 1
        },
        {
          slot: 48,
          header_hash: "0x1beca774…",
          beefy_root: "0xebfeb74b…",
          state_root: "0xd095c60f…",
          reported: 1
        },
        {
          slot: 49,
          header_hash: "0x7c7ee195…",
          beefy_root: "0x41063bd0…",
          state_root: "0x5ee4b142…",
          reported: 1
        },
        {
          slot: 50,
          header_hash: "0xd72b6d61…",
          beefy_root: "0x84455b22…",
          state_root: "0xec88ce8e…",
          reported: 2
        },
        {
          slot: 51,
          header_hash: "0xb03fe361…",
          beefy_root: "0xab660b22…",
          state_root: "0x00000000…",
          reported: 1
        }
      ],
      belt: [
        "0x00000000…",
        "0xad3228b6…",
        null,
        null,
        "0xe58769b3…",
        "0x0eb01ebf…"
      ]
    },
    block: {
      slot: 52,
      parent_state_root: "0x0cb57376…",
      reported: 1
    }
  },
  {
    n: 53,
    before: {
      history: [
        {
          slot: 45,
          header_hash: "0xdf827752…",
          beefy_root: "0x8e61f98d…",
          state_root: "0x1e90a7be…",
          reported: 1
        },
        {
          slot: 46,
          header_hash: "0xb3711eed…",
          beefy_root: "0xbede1624…",
          state_root: "0xa61f6f99…",
          reported: 0
        },
        {
          slot: 47,
          header_hash: "0x12d04d3e…",
          beefy_root: "0x524e191c…",
          state_root: "0x2f529bd8…",
          reported: 1
        },
        {
          slot: 48,
          header_hash: "0x1beca774…",
          beefy_root: "0xebfeb74b…",
          state_root: "0xd095c60f…",
          reported: 1
        },
        {
          slot: 49,
          header_hash: "0x7c7ee195…",
          beefy_root: "0x41063bd0…",
          state_root: "0x5ee4b142…",
          reported: 1
        },
        {
          slot: 50,
          header_hash: "0xd72b6d61…",
          beefy_root: "0x84455b22…",
          state_root: "0xec88ce8e…",
          reported: 2
        },
        {
          slot: 51,
          header_hash: "0xb03fe361…",
          beefy_root: "0xab660b22…",
          state_root: "0x0cb57376…",
          reported: 1
        },
        {
          slot: 52,
          header_hash: "0x4dfaa475…",
          beefy_root: "0xf4f39b4f…",
          state_root: "0x00000000…",
          reported: 1
        }
      ],
      belt: [
        null,
        null,
        "0xb4c11951…",
        null,
        "0xe58769b3…",
        "0x0eb01ebf…"
      ]
    },
    block: {
      slot: 53,
      parent_state_root: "0x0a2dca4f…",
      reported: 0
    }
  }
];
