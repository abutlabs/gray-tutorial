# JAM at a glance

Optional, and no code: what a JAM network does with work, before the lessons explain how.
Every piece comes back in its own lesson, so nothing here needs to stick yet.

JAM is a blockchain run by *validators*: computers that take turns adding a block, one
every 6 seconds, a *slot*. The work people send in is done on *cores*. A core isn't a
machine: it's a lane of work, run at any moment by three validators, its *guarantors*,
who switch to another core every few slots. Everyone else keeps a piece of the work, says
they hold it, and applies the result once enough of them do.

Here it is in miniature: *tiny*, the small configuration your client tests on, with 6
validators and 2 cores, whose guarantors switch every 4 slots (24 seconds). Press play to
watch a real chain in slow motion, one block a slot.

<SlotPlayer />

Or take it one step at a time: follow a work-package through its trip, and slide the slot
to watch the guarantors move.

<JamNetwork only="tiny" />

The real network works the same way, only bigger: [lesson 4.2](./04-blocks/02-tiny-and-full.md) shows it.

Ready to build one? [Start here](./index.md).
