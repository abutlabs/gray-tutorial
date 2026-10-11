// nspell ships no types: the one call the spellcheck (tools/spelling.ts) makes.
declare module "nspell" {
  type Dictionary = { aff: Uint8Array | string; dic: Uint8Array | string };
  export default function nspell(dictionary: Dictionary): { correct(word: string): boolean };
}
