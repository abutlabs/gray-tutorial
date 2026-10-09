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
