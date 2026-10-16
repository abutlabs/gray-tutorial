// Lesson 12.2's widget: every signature on a guarantee must check against its signer's key
// after Φ, and 𝐆, the reporters, is everyone who signed, once each. The values are the run's
// vector, reports/tiny/different_core_same_guarantors-1: two guarantees, for cores 0 and 1,
// both signed by validators 1, 4 and 5. Making a signer an offender zeroes its key, as Φ
// does, and its genuine signature stops checking. tools/widget-signed-counted.test.ts checks
// every value against the lesson's code, run and vector.

import type { Json } from "./codec-map.ts";
import { encodeMapped, fromHex } from "./codec-map.ts";
import { H } from "./hash.ts";
import { ascii, verify } from "./sign-check.ts";
import { WORK_REPORT } from "./work-report.ts";

/** The vector's guarantees: each report, the slot its guarantors signed in, and their signatures. */
export const GUARANTEES: { core: number; slot: number; report: Json; signatures: { validator_index: number; signature: string }[] }[] = [
  {
    "core": 0,
    "slot": 14,
    "report": {
      "package_spec": {
        "hash": "0x63c03371b9dad9f1c60473ec0326c970984e9c90c0b5ed90eba6ada471ba4d86",
        "length": 17180,
        "erasure_root": "0x9fc7e637969aef1a95dfb560a914cf5161a76498db3aa19df131cea199ed6e44",
        "erasure_shards": 6,
        "exports_root": "0x5c9dca800c145685f052ce1ba343e2b66b4c333ee4c4ca3b29cb347b1009cb83",
        "exports_count": 3
      },
      "context": {
        "anchor": "0x39cb518983b02695034b3b92cb31a7334e1a2ec3ef7dbfa32c68e4e8444363f1",
        "anchor_slot": 12,
        "state_root": "0xd8c577816b629241676502d0461e4eae42a375461314d64484f35f4228da23d6",
        "beefy_root": "0xf5df0c11416d43c55b43e096572d450b7780ed0fd7b540f26c8ded8e0d41e183",
        "lookup_anchor": "0x16bda47e5a68daf53c39ddee8af4ecaced7e87f3f0ac9da5a6f4f9e41350d319",
        "lookup_anchor_slot": 6,
        "lookup_anchor_state_root": "0x833233f94a4fe86915a06f463953199b02d051af90b62da1a7ccb436550e2ec0",
        "prerequisites": []
      },
      "core_index": 0,
      "authorizer_hash": "0x9a3a97d1950356ef6d3c20acb5ab6699be454b1498ecd513bdc6d849497e42eb",
      "auth_gas_used": 0,
      "auth_output": "0x",
      "segment_root_lookup": [],
      "results": [
        {
          "service_id": 42,
          "code_hash": "0x6470fd21983eae8d706f1edd5e2dc5afe095980f8fb7bd4ebfd33550d8730246",
          "payload_hash": "0x3cf2d09da453bbdd6b68d8a1acd5f15ba23ba46d4ff087592b3d319432500a50",
          "accumulate_gas": 18012,
          "result": {
            "ok": "0x64756d6d792d726573756c74"
          },
          "refine_load": {
            "gas_used": 821,
            "imports": 8,
            "extrinsic_count": 8,
            "extrinsic_size": 1526,
            "exports": 17
          }
        }
      ]
    },
    "signatures": [
      {
        "validator_index": 1,
        "signature": "0x236ff16186c61611e4712c8ec2a4625ccee443ccc9ee1539fdf3bb044ff3156311a3533ae205dbc8e480ddf0e6ba2963174ed11c94f231b553f7fe59cfb5c50d"
      },
      {
        "validator_index": 4,
        "signature": "0x55f98a266c0a21fe56515bc903894716e1197f754cfdccbb605e4bd5bcabef3dc3fdf1c4aee17740b04e4b8a3b56e2e31dc22bba3bdcc07061a34ef3616e4202"
      },
      {
        "validator_index": 5,
        "signature": "0x9e387b2c4cf638a92719652254d4559350e41c5d1ef086864f3adc564d7e846a818a1d5b3390f3ce83436ae75baeb7d18df8903bf3f4e16760b8763548fc7f08"
      }
    ]
  },
  {
    "core": 1,
    "slot": 18,
    "report": {
      "package_spec": {
        "hash": "0xa300c7a2ec3b6e09c01d64d74afa36d62f66161be1b4c89baf77756cbcc38a5a",
        "length": 15021,
        "erasure_root": "0x9fc7e637969aef1a95dfb560a914cf5161a76498db3aa19df131cea199ed6e44",
        "erasure_shards": 6,
        "exports_root": "0x5c9dca800c145685f052ce1ba343e2b66b4c333ee4c4ca3b29cb347b1009cb83",
        "exports_count": 3
      },
      "context": {
        "anchor": "0x39cb518983b02695034b3b92cb31a7334e1a2ec3ef7dbfa32c68e4e8444363f1",
        "anchor_slot": 12,
        "state_root": "0xd8c577816b629241676502d0461e4eae42a375461314d64484f35f4228da23d6",
        "beefy_root": "0xf5df0c11416d43c55b43e096572d450b7780ed0fd7b540f26c8ded8e0d41e183",
        "lookup_anchor": "0x16bda47e5a68daf53c39ddee8af4ecaced7e87f3f0ac9da5a6f4f9e41350d319",
        "lookup_anchor_slot": 6,
        "lookup_anchor_state_root": "0x833233f94a4fe86915a06f463953199b02d051af90b62da1a7ccb436550e2ec0",
        "prerequisites": []
      },
      "core_index": 1,
      "authorizer_hash": "0x9a3a97d1950356ef6d3c20acb5ab6699be454b1498ecd513bdc6d849497e42eb",
      "auth_gas_used": 0,
      "auth_output": "0x",
      "segment_root_lookup": [],
      "results": [
        {
          "service_id": 42,
          "code_hash": "0x6470fd21983eae8d706f1edd5e2dc5afe095980f8fb7bd4ebfd33550d8730246",
          "payload_hash": "0x3cf2d09da453bbdd6b68d8a1acd5f15ba23ba46d4ff087592b3d319432500a50",
          "accumulate_gas": 16083,
          "result": {
            "ok": "0x64756d6d792d726573756c74"
          },
          "refine_load": {
            "gas_used": 513,
            "imports": 6,
            "extrinsic_count": 6,
            "extrinsic_size": 1986,
            "exports": 19
          }
        }
      ]
    },
    "signatures": [
      {
        "validator_index": 1,
        "signature": "0x52ddd0bb97297e5823409b1491a16c1ccb546d6a89a9e66c35d76efaeeec7139d5eca2408e504e60737170bca0e155a84b0852c5d0598fb659e9381fd7078401"
      },
      {
        "validator_index": 4,
        "signature": "0xca7923dc7880c061069bba4c2807f403d2194ddaf3bacce032cbc2692e7998350938bb4df849b990d029610d5263ecb47be485f414a1bf5c168db0581a57ca05"
      },
      {
        "validator_index": 5,
        "signature": "0x6cb6050df366f8581c8dab651fb38a6a5e3f23e146913d2367cc7f151c38a4799f5921387f2aa5a938b32211728836b63f83969fcb21af2a587a515ff66e1104"
      }
    ]
  }
];
/** The signers' Ed25519 keys: the assignment's, which here are κ's. */
export const KEYS: Record<number, string> = {"1": "0xad93247bd01307550ec7acd757ce6fb805fcf73db364063265b30a949e90d933", "4": "0x8b8c5d436f92ecf605421e873a99ec528761eb52a88a2f9a057b3b3003e6f32a", "5": "0xab0084d01534b31c1dd87c81645fd762482a90027754041ca1b56133d0466c06"};
export const ZEROS = "0x" + "00".repeat(32);

/** What a guarantor signs: X_G, "jam_guarantee", then the report's hash. */
export const messageOf = (report: Json): number[] => [...ascii("jam_guarantee"), ...H(encodeMapped(WORK_REPORT, report).bytes)];

/** Each signature, checked against its signer's key, or zeros for an offender. */
export function checked(offenders: Set<number>) {
  return GUARANTEES.map((g) => {
    const message = messageOf(g.report);
    return {
      core: g.core,
      slot: g.slot,
      signatures: g.signatures.map((s) => {
        const key = offenders.has(s.validator_index) ? ZEROS : KEYS[s.validator_index];
        let ok = false;
        try { ok = verify(fromHex(key), message, fromHex(s.signature)); } catch { ok = false; }
        return { validator: s.validator_index, key, ok };
      }),
    };
  });
}

/** 𝐆: every signer's key, once each, sorted, as the lesson's reporters makes it. */
export const reporters = (keys: string[]): string[] => [...new Set(keys)].sort();
