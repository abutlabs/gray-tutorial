# Part 17 · Accumulation

Accumulation is the moment a block's finished work reaches the chain: each service folds
the results of its work into its own state. Part 16 ran one service at a time. This part
runs a whole block the way the Gray Paper's §12 says, one idea at a time: first the
simplest block, then reports that wait for others, then transfers between services,
sent and then delivered, then the privileges a few services hold. The block's gas
budget comes later.

- [17.1 A block's accumulation](./01-a-blocks-accumulation.md)
- [17.2 Waiting reports](./02-waiting-reports.md)
- [17.3 Sending a transfer](./03-sending-a-transfer.md)
- [17.4 Rounds](./04-rounds.md)
- [17.5 Privileges](./05-privileges.md)
- [17.6 Who wins](./06-who-wins.md)
- [17.7 Ejecting a service](./07-ejecting-a-service.md)
- [17.8 Creating a service](./08-creating-a-service.md)
