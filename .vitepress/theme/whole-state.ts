// Lesson 19.2's widget: the whole state before storage block 50, part by part: sixteen
// components, C(1) to C(16), each a Gray Paper letter with its size in bytes, and service 0's
// account, its record at C(255, 0) and 154 entries: 171 entries in all.
// tools/widget-whole-state.test.ts checks every size against the lesson's run.

import { COMPONENTS } from "./state-keys.ts";

/** Each component's size in that state, as the run prints it. */
export const SIZES = [0, 514, 5120, 1296, 2547, 4, 128, 2017, 2017, 2017, 4036, 4, 21, 335, 12, 300, 1];
/** Which Part of the tutorial built each component. */
export const BUILT_IN = ["", "13", "13", "9", "8", "10", "8", "8", "8", "8", "10 to 12", "7", "17", "18", "17", "17", "17"];
export const ACCOUNT_ENTRIES = 154;
export const TOTAL = 16 + 1 + ACCOUNT_ENTRIES;
export const parts = COMPONENTS.slice(1).map((name, k) => ({ i: k + 1, letter: name.split(",")[0], says: name.slice(name.indexOf(",") + 2), size: SIZES[k + 1], part: BUILT_IN[k + 1] }));
