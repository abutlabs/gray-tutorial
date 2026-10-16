// Lesson 19.5's second widget: a set's one order. ξ's newest slot after storage_light block 6
// holds two packages. A set has no order, but bytes do: Appendix D writes it sorted. Written
// in the order they accumulated, the state root came out 0xdb92c20d…; sorted, it is the
// trace's, 0x1a75fe79…. tools/widget-set-order.test.ts checks them against the trace and red.

export const PACKAGES = [
  "0xe6d46a0c589a705b1abb3695749f7298e5f5aca6885a0b5753251e065907ed8b",
  "0x0d8aed1a139762a96f8e45e266f92890fb14aa3eb994e687c15e31394ea46348",
];
export const SORTED_ROOT = "0x1a75fe79a3bb1fc635030f6dd1466d071da06dd00b79d5a7b55552f295efa9de";
export const OTHER_ROOT = "0xdb92c20d9930f30e90dc05911b23435f295341649f9ef1ee1c8026796c7b9bda";
export const isSorted = (xs: string[]): boolean => xs.every((x, i) => i === 0 || xs[i - 1] <= x);
/** The slot's bytes: the count, then each hash. */
export const bytesOf = (xs: string[]): string => [xs.length.toString(16).padStart(2, "0"), ...xs.map((x) => x.slice(2, 10) + "…")].join(" ");
