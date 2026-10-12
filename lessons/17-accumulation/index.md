# Part 17 · Accumulation

Accumulation is the moment a block's finished work reaches the chain: each service folds
the results of its work into its own state. [Part 16](../16-host-calls/index.md) ran one service at a time. This part
runs a whole block the way the Gray Paper's §12 says, one idea at a time: first the
simplest block, then reports that wait for others, then transfers between services,
sent and then delivered, then the privileges a few services hold, services that leave
and services that arrive, the block's gas budget, and last the host calls that remain.

By the end of this part your client accumulates whole blocks: waiting reports, transfers,
privileges, services ejected and created, a gas budget, upgrades, yields and their root,
and provided preimages. All 63 official accumulate vectors pass as whole blocks.

**Builds on** [Part 3 · Work and reports](../03-work-and-reports/index.md), [Part 4 ·
Blocks](../04-blocks/index.md), [Part 5 · Hashing and
signatures](../05-hashing-and-signatures/index.md), [Part 9 · Recent
history](../09-recent-history/index.md), [Part 13 · Authorization](../13-authorization/index.md), [Part 14 · Services and
preimages](../14-services/index.md), [Part 15 · The PVM](../15-the-pvm/index.md) and [Part
16 · Host calls](../16-host-calls/index.md), and on the foundations every part uses,
[Parts 0 to 2](../index.md#lessons).

**Starting here?** At the repo root, `npm run catch-up -- 16.9` makes your client the one
this part starts from; [How to read it](../index.md#how-to-read-it) says more.

- [17.1 A block's accumulation](./01-a-blocks-accumulation.md)
- [17.2 Waiting reports](./02-waiting-reports.md)
- [17.3 Sending a transfer](./03-sending-a-transfer.md)
- [17.4 Rounds](./04-rounds.md)
- [17.5 Privileges](./05-privileges.md)
- [17.6 Who wins](./06-who-wins.md)
- [17.7 Ejecting a service](./07-ejecting-a-service.md)
- [17.8 Creating a service](./08-creating-a-service.md)
- [17.9 The block's gas budget](./09-the-blocks-gas-budget.md)
- [17.10 Upgrading a service](./10-upgrading-a-service.md)
- [17.11 What a service yields](./11-what-a-service-yields.md)
- [17.12 Providing a preimage](./12-providing-a-preimage.md)
- [17.13 Blessing and designating](./13-blessing-and-designating.md)

**Test yourself:** [Ch. 12 Accumulation](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch12-accumulation),
self-test cards on JAM learning.
