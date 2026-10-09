# Part 16 · Host calls

A service is a program in a sealed box. It can compute all it likes, but it can't see the
chain: everything it learns, and everything it changes, goes through the host. This part
builds the host's side of the conversation: first the loop that answers, then the host
calls an accumulating service needs, a few at a time, until a real accumulation matches
the test vectors down to the last unit of gas.

- [16.1 Calling the host](./01-calling-the-host.md)
- [16.2 Fetch](./02-fetch.md)
- [16.3 Growing the heap](./03-growing-the-heap.md)
- [16.4 Info](./04-info.md)
