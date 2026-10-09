# Part 17 · Accumulation

Accumulation is the moment a block's finished work reaches the chain: each service folds
the results of its work into its own state. Part 16 ran one service at a time. This part
runs a whole block the way the Gray Paper's §12 says, one idea at a time: first the
simplest block, then reports that wait for others, the gas budget for a block,
privileges, and transfers between services.

- [17.1 A block's accumulation](./01-a-blocks-accumulation.md)
- [17.2 Waiting reports](./02-waiting-reports.md)
