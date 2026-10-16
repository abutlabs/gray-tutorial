// The headers of blocks 1 to 4 of the tiny fallback trace, as traces/fallback/00000001.json
// to 00000004.json hold them (the vectors' JSON, copied as it is): lesson 5.1's chain, which
// hash-chain.ts encodes and hashes. tools/widget-hash-chain.test.ts checks them against the
// vectors where vectors/ is downloaded.

import type { Json } from "./codec-map.ts";

export const FALLBACK_HEADERS: Json[] = [
  {
    parent: "0x245becfe7f091e38fcc013ce7d8dff1f2838588837d57ba6b6fbcdaf89abb76c",
    parent_state_root: "0xd6e78dc07a9ae915ada8306bf0da89b11044a2d4ee71ae0c5faf61f34f6b3a0c",
    extrinsic_hash: "0x189d15af832dfe4f67744008b62c334b569fcbb4c261e0f065655697306ca252",
    slot: 1,
    epoch_mark: null,
    tickets_mark: null,
    author_index: 0,
    entropy_source: "0x62bc9d2311da8db52da45c5785333b39da3f1464b0d0341d12e2ee2987da6595463487a2d903c169560a90521ce06ecc99e466afeaa04f766e4e6fd3bf3677170282a54709e0e92a1a37c853f8c83053c9746e53581366bf1aaedd621bd4a713",
    offenders_mark: [],
    seal: "0x39ca45236c96eae24d57127288f16bf6e64dfbbf8d1d693e660474a4d43a424affae293e3329a7523c6e6f4ea1e7e3274d99fc9d531a6989c37bacb509551a0fc817b238c629908f3d1b3d19e30848dc96dce7109729fa90b9e0314b98463011"
  },
  {
    parent: "0x5592b088d8760232d117f90a2a962e640f2a7254f52658ee6af9664289d9620a",
    parent_state_root: "0x48dc323d05aa152a53fb4f38b690d8198994f9fdb86bf1a6300b306cc79f86f9",
    extrinsic_hash: "0x189d15af832dfe4f67744008b62c334b569fcbb4c261e0f065655697306ca252",
    slot: 2,
    epoch_mark: null,
    tickets_mark: null,
    author_index: 3,
    entropy_source: "0x635d6b1cd157934ab5867aa23bcb674989df30bb89853db2b1756e0fe24e318239fbdd0246efa09e6940f9ad136ec0d412cae086f5e1ef3ed5fdc58e1dedba1c3390dee109dace4b386fd0b6687e144e0290186da441fd7d85962cbb1e111308",
    offenders_mark: [],
    seal: "0xdb76cc5a2cc0f628b4a5e5e60e4f2e435b60d49542bfc546228b1607906362717f4da67d2274d843a46e40b5a894148da1844033a720dcffa9bafffbe8fde3185c21eed7f69b44757b577b6095a454e22e98153a8d8efbb0708364be53e9d913"
  },
  {
    parent: "0x3d27225ddf67aba719076c0ec8f35815960a0a2fd4e2c906e444d1f7d3e6805b",
    parent_state_root: "0x99275d5f6513b3267fa03bb0d8ee094e68a240037b461c20700ee8bae5f3a5f2",
    extrinsic_hash: "0x189d15af832dfe4f67744008b62c334b569fcbb4c261e0f065655697306ca252",
    slot: 3,
    epoch_mark: null,
    tickets_mark: null,
    author_index: 3,
    entropy_source: "0x635d6b1cd157934ab5867aa23bcb674989df30bb89853db2b1756e0fe24e318239fbdd0246efa09e6940f9ad136ec0d412cae086f5e1ef3ed5fdc58e1dedba1c3390dee109dace4b386fd0b6687e144e0290186da441fd7d85962cbb1e111308",
    offenders_mark: [],
    seal: "0xdb76cc5a2cc0f628b4a5e5e60e4f2e435b60d49542bfc546228b160790636271aca31d596e3914f2614c91283f29cac483b0dee3ab7024f8c97598143d03500d9eb411b1e14870a9420917b4331fe9a71fad968676692030358cb11e1e1db10e"
  },
  {
    parent: "0xa8c292a99c86a343f4e1f6cf378a49a6236bed2e00a47e570e7062e7c4aa6ece",
    parent_state_root: "0x391b7afd388b89226764629c09633a15e84f72fa5f03f28540b50cc025ff543c",
    extrinsic_hash: "0x189d15af832dfe4f67744008b62c334b569fcbb4c261e0f065655697306ca252",
    slot: 4,
    epoch_mark: null,
    tickets_mark: null,
    author_index: 5,
    entropy_source: "0xc50ffdade8936f3a7ceda394ec831ff3a840d64525388038f693825004b5005e24b2dbbe2dc19a86920335dc3d97812e9dca8fb3ee7f3a19d8c5de1a5d8fdd117b7d993feffff1e6fe5029d27b1d0106ee7e1b1432aa4102d93d6c4dba550c07",
    offenders_mark: [],
    seal: "0x6140e0da2eff1e03140bc6c8aec7bcb9ef244f2b345cdd09edf3e4c8a5199ac74f26ec369981b9aae26cc8b4aebc4374e92fc9f1a4ac2e8c342ffb7eb1f24a13b2716aadcccf637a6faffa0f0dcbe3c433c4eb41ed4d14ec0ceabc152e11ba18"
  }
];
