/** Runs `worker` over `items` at most `size` at a time: bounded, never sequential and never unlimited. */
export async function processInChunks<T, R>(
  items: readonly T[],
  size: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += size) {
    const chunk = items.slice(start, start + size);
    results.push(...(await Promise.all(chunk.map(worker))));
  }
  return results;
}
