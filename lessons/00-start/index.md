# Part 0 · Start

What JAM is, what a client has to do, how these lessons work, and a project that watches
itself from the start: the observability stack, a client that reports every run to it,
and your first piece of JAM, the clock.

By the end of this part your client knows JAM's clock, has its first tests, and reports
every run to Grafana, where you'll watch it from now on.

## At a glance

All of JAM, in one equation from the Gray Paper (§4, *Overview*):

$$
\sigma' \equiv \Upsilon(\sigma, B)
$$

| Symbol | Say it | Here |
| --- | --- | --- |
| [σ](../symbols.md#state) | sigma | the chain's state before a block: everything it remembers |
| [B](../symbols.md#block) | B | the block: a header and its extrinsic |
| [Υ](../symbols.md#transition) | upsilon | the state-transition function: the rules |
| [σ′](../symbols.md#prime) | sigma prime | the state after the block |
| [≡](../symbols.md#defined-as) | is defined as | the left side is, by definition, the right |

Take a state and a block, apply the rules, get the next state. That's the whole of a
blockchain, and your client is Υ: by the end, hand it a state and a block and it answers
with σ′, byte for byte the same as every other JAM client. Here it is on real blocks:

<StfStep />

[Lesson 0.1](./01-what-you-will-build.md) says more.

## This part, on one map

Boxes are what your client holds, and rounded cards are the steps between them; a dashed
card happens outside your client. Tap any card, or walk through them in order with *next*.

<PartFlow :part="0" />

- [0.1 What you will build](./01-what-you-will-build.md)
- [0.2 Set up the project](./02-set-up-the-project.md)
- [0.3 Watch your client](./03-watch-your-client.md)
- [0.4 The JAM clock](./04-the-jam-clock.md)

**Test yourself:** [F0 · Start here: JAM in five minutes](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=f00-start-here),
self-test cards on JAM learning.
