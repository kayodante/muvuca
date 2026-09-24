import { describe, expect, it } from "vitest";
import { processInChunks } from "../concurrency";

describe("processInChunks", () => {
  it("returns results in the same order as input items", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    // A worker that resolves in reverse order of its value (higher value = faster)
    // If results aren't properly mapped, they would return out of order.
    const worker = async (item: number) => {
      await new Promise((resolve) => setTimeout(resolve, (10 - item) * 5));
      return item * 2;
    };

    const results = await processInChunks(items, 3, worker);
    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]);
  });

  it("never exceeds the maximum concurrency size", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let currentInFlight = 0;
    let peakInFlight = 0;

    const worker = async (item: number) => {
      currentInFlight++;
      if (currentInFlight > peakInFlight) {
        peakInFlight = currentInFlight;
      }

      // Yield to the event loop so other workers in the chunk can start
      await new Promise((resolve) => setTimeout(resolve, 10));

      currentInFlight--;
      return item;
    };

    await processInChunks(items, 3, worker);
    expect(peakInFlight).toBe(3);
  });

  it("handles empty arrays", async () => {
    const results = await processInChunks([], 3, async (x) => x);
    expect(results).toEqual([]);
  });
});
