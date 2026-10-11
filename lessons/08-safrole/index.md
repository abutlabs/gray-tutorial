# Part 8 · Safrole

Who makes the next block? Safrole, JAM's block-production engine, decides. A lottery picks
the authors of each epoch's slots, and nobody learns who won a slot until its winner
makes the block. This part builds Safrole piece by piece, starting with the randomness
that makes the lottery fair.

By the end of this part your client runs Safrole for every block that brings no tickets:
the whole state after it and both marks for its header, right on every vector it can
run. Entering tickets needs Bandersnatch, which comes later.

- [8.1 Stirring the entropy](./01-stirring-the-entropy.md)
- [8.2 Rotating the validators](./02-rotating-the-validators.md)
- [8.3 The fallback sealers](./03-the-fallback-sealers.md)
- [8.4 The lottery's winners](./04-the-lotterys-winners.md)
- [8.5 One step of Safrole](./05-one-step-of-safrole.md)

**Test yourself:** [Ch. 6 Block Production and Chain Growth (Safrole)](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=ch06-safrole),
self-test cards on JAM learning.
