import { processInChunks } from "../concurrency";
import { test, expect } from "vitest";

test("processInChunks bounds concurrency and preserves order", async () => {
  let activeWorkers = 0;
  let maxActiveWorkers = 0;

  const items = Array.from({ length: 10 }, (_, i) => i);

  const worker = async (item: number) => {
    activeWorkers++;
    if (activeWorkers > maxActiveWorkers) {
      maxActiveWorkers = activeWorkers;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
    activeWorkers--;
    return item * 2;
  };

  const results = await processInChunks(items, 3, worker);

  expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  expect(maxActiveWorkers).toBeLessThanOrEqual(3);
});
