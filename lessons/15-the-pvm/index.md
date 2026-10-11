# Part 15 · The PVM

Services are programs, and the PVM is the machine that runs them: thirteen registers,
32-bit memory in pages, a gas meter, and 139 instructions. This part
builds it, starting by unpacking a real service's code.

By the end of this part your client has a complete PVM: every instruction, memory, a real
program's setup ([lesson 15.8](./08-a-real-program.md) puts 15.1 to 15.7 together), host calls as a way out, and
gas, charged the Gray Paper's way.

- [15.1 The program blob](./01-the-program-blob.md)
- [15.2 Instructions](./02-instructions.md)
- [15.3 The machine](./03-the-machine.md)
- [15.4 Memory](./04-memory.md)
- [15.5 Arithmetic](./05-arithmetic.md)
- [15.6 Branches and calls](./06-branches-and-calls.md)
- [15.7 Bits and bytes](./07-bits-and-bytes.md)
- [15.8 A real program](./08-a-real-program.md)
- [15.9 What instructions cost](./09-what-instructions-cost.md)
- [15.10 The pipeline](./10-the-pipeline.md)
- [15.11 The gas meter](./11-the-gas-meter.md)

**Test yourself:** [E · PVM (Appendix A)](https://abutlabs.github.io/jam-learning/lasair/exam.html?chapter=e-pvm),
self-test cards on JAM learning.
