// Three safrole vectors' entropy, as stf/safrole/tiny/*.json hold it (the vectors' values,
// copied as they are): the slot before and the block's, the block's VRF output, and η
// before and after. entropy-stairs.ts stirs them; tools/widget-entropy-stairs.test.ts checks
// them against the vectors where vectors/ is downloaded.

export type EtaVector = { name: string; tau: number; slot: number; vrf: string; before: string[]; after: string[] };
export const ETA_VECTORS: EtaVector[] = [
  {
    name: "enact-epoch-change-with-no-tickets-4",
    tau: 10,
    slot: 15,
    vrf: "0x92e69aed566b11bf02354c64e44235b79154207021b7db0f03ca62108f826f94",
    before: [
      "0xf164ce89b10488598cb295e4eef273fb8977722f4d6b2754b970ac77b45fa29b",
      "0xee155ace9c40292074cb6aff8c9ccdd273c81648ff1149ef36bcea6ebb8a3e25",
      "0xbb30a42c1e62f0afda5f0a4e8a562f7a13a24cea00ee81917b86b89e801314aa",
      "0xe88bd757ad5b9bedf372d8d3f0cf6c962a469db61a265f6418e1ffed86da29ec"
    ],
    after: [
      "0x760612c571119ba1af27e99ad6c47b3905469f87cb0453e648df973d003f2160",
      "0xf164ce89b10488598cb295e4eef273fb8977722f4d6b2754b970ac77b45fa29b",
      "0xee155ace9c40292074cb6aff8c9ccdd273c81648ff1149ef36bcea6ebb8a3e25",
      "0xbb30a42c1e62f0afda5f0a4e8a562f7a13a24cea00ee81917b86b89e801314aa"
    ]
  },
  {
    name: "publish-tickets-no-mark-2",
    tau: 0,
    slot: 1,
    vrf: "0x8c2e6d327dfaa6ff8195513810496949210ad20a96e2b0672a3e1b9335080801",
    before: [
      "0x03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314",
      "0xee155ace9c40292074cb6aff8c9ccdd273c81648ff1149ef36bcea6ebb8a3e25",
      "0xbb30a42c1e62f0afda5f0a4e8a562f7a13a24cea00ee81917b86b89e801314aa",
      "0xe88bd757ad5b9bedf372d8d3f0cf6c962a469db61a265f6418e1ffed86da29ec"
    ],
    after: [
      "0xa0243a82952899598fcbc74aff0df58a71059a9882d4416919055c5d64bf2a45",
      "0xee155ace9c40292074cb6aff8c9ccdd273c81648ff1149ef36bcea6ebb8a3e25",
      "0xbb30a42c1e62f0afda5f0a4e8a562f7a13a24cea00ee81917b86b89e801314aa",
      "0xe88bd757ad5b9bedf372d8d3f0cf6c962a469db61a265f6418e1ffed86da29ec"
    ]
  },
  {
    name: "skip-epochs-1",
    tau: 10,
    slot: 46,
    vrf: "0x8c2e6d327dfaa6ff8195513810496949210ad20a96e2b0672a3e1b9335080801",
    before: [
      "0x03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314",
      "0xee155ace9c40292074cb6aff8c9ccdd273c81648ff1149ef36bcea6ebb8a3e25",
      "0xbb30a42c1e62f0afda5f0a4e8a562f7a13a24cea00ee81917b86b89e801314aa",
      "0xe88bd757ad5b9bedf372d8d3f0cf6c962a469db61a265f6418e1ffed86da29ec"
    ],
    after: [
      "0xa0243a82952899598fcbc74aff0df58a71059a9882d4416919055c5d64bf2a45",
      "0x03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314",
      "0xee155ace9c40292074cb6aff8c9ccdd273c81648ff1149ef36bcea6ebb8a3e25",
      "0xbb30a42c1e62f0afda5f0a4e8a562f7a13a24cea00ee81917b86b89e801314aa"
    ]
  }
];
