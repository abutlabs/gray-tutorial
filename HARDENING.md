# Hardening: what the first pass leaves out on purpose

The first pass of every lesson teaches the base rule, so the reader sees the idea work
without a thicket of special cases. A real client must also survive hostile input (the
official conformance fuzzer sends plenty), so each item below comes back later, in a
hardening pass: test-first, with the vector or fuzzer case that needs it.

| Item | Where | Why it matters | What needs it |
| --- | --- | --- | --- |
| No timeout on reports | `src/obs.ts`, `report` (0.3) | A stack that accepts the connection but never answers would hang every program and test run. `AbortSignal.timeout` on each `fetch` fixes it. | Robustness, no vector |
| Why a report failed | `src/obs.ts`, `report` (0.3) | The catch says only "is the stack up?"; the real reason (refused, an HTTP error from Loki, a full disk) is thrown away. | Debugging the stack |
| A unit test for `report` without Docker | `test/` (0.3) | `report` is checked end to end (verify's `# prints: reported`), but nothing tests what it sends without a running stack. A small HTTP server inside the test can stand in. | Running the tests where Docker isn't |
| Bigints in events | `src/obs.ts`, `line` (2.7) | `JSON.stringify` throws on a `bigint`. The first event that carries a u64 (gas, a balance) needs the replacer to write it as a decimal string. | The first event with a u64 |
| Moments outside the era | `src/time.ts`, `slotAt` (0.4) | Before 12:00 UTC on 1 January 2025 `slotAt` returns a negative number, and from August 2841 on a slot no longer fits in 32 bits (timeslots are ℕ below 2^32, GP §4). Refuse both. | A clock set wrong; slots read from hostile input |
| Hex that isn't "0x" hex | `src/bytes.ts`, `fromHex` (1.1) | `fromHex` assumes the `0x` and skips two characters without looking, so `"0102"` would silently lose its first byte. Check the prefix; refuse an odd number of digits and non-hex characters with a clear error. | Hex from anywhere but the vectors |
| JSON integers above 2^53 | `test/vectors.ts`, `vectorJson` (2.6); the codecs' `fromJson` (2.4) | `JSON.parse` rounds an integer above 2^53 silently, so a u64 written as a JSON number would arrive wrong and a test could pass when it shouldn't. Today every number in the v0.8.0 vectors' JSON is below 2^53. Read big integers from their digits with a `JSON.parse` reviver (`context.source`), as a `bigint`, and accept a `bigint` in `fromJson`. | The first vector with a u64 above 2^53 in its JSON |
