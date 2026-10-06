/** A single bounded queue shared by all requests in this Node process. */
export class ConversionQueue {
  private active = 0;
  private waiting: Array<() => void> = [];
  constructor(private readonly concurrency: number, private readonly maxWaiting = 1000) {
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Invalid queue concurrency");
  }
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      if (this.waiting.length >= this.maxWaiting) throw new Error("Conversion queue is full");
      await new Promise<void>(resolve => this.waiting.push(resolve));
    } else this.active++;
    try { return await task(); }
    finally {
      const next = this.waiting.shift();
      if (next) next(); else this.active--;
    }
  }
}
