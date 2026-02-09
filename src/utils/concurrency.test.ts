import { describe, it, expect } from "vitest";
import { mapWithConcurrency, DEFAULT_CONCURRENCY } from "./concurrency.js";

describe("mapWithConcurrency", () => {
  it("returns fulfilled results for all items", async () => {
    const items = [1, 2, 3];
    const results = await mapWithConcurrency(items, async (n) => n * 2);

    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.status).toBe("fulfilled");
    }
    expect((results[0] as PromiseFulfilledResult<number>).value).toBe(2);
    expect((results[1] as PromiseFulfilledResult<number>).value).toBe(4);
    expect((results[2] as PromiseFulfilledResult<number>).value).toBe(6);
  });

  it("preserves input order even with variable delays", async () => {
    const items = [30, 10, 20];
    const results = await mapWithConcurrency(
      items,
      async (ms) => {
        await new Promise((r) => setTimeout(r, ms));
        return ms;
      },
      3
    );

    expect((results[0] as PromiseFulfilledResult<number>).value).toBe(30);
    expect((results[1] as PromiseFulfilledResult<number>).value).toBe(10);
    expect((results[2] as PromiseFulfilledResult<number>).value).toBe(20);
  });

  it("isolates rejections without blocking others", async () => {
    const items = ["ok", "fail", "ok2"];
    const results = await mapWithConcurrency(items, async (s) => {
      if (s === "fail") throw new Error("boom");
      return s;
    });

    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    expect((results[1] as PromiseRejectedResult).reason).toBeInstanceOf(Error);
    expect(results[2].status).toBe("fulfilled");
    expect((results[2] as PromiseFulfilledResult<string>).value).toBe("ok2");
  });

  it("respects concurrency limit", async () => {
    let running = 0;
    let maxRunning = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await mapWithConcurrency(
      items,
      async (n) => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 10));
        running--;
        return n;
      },
      3
    );

    expect(maxRunning).toBe(3);
  });

  it("handles empty array", async () => {
    const results = await mapWithConcurrency([], async (n: number) => n);
    expect(results).toHaveLength(0);
  });

  it("works with concurrency = 1 (sequential)", async () => {
    const order: number[] = [];
    const items = [1, 2, 3];

    await mapWithConcurrency(
      items,
      async (n) => {
        order.push(n);
        return n;
      },
      1
    );

    expect(order).toEqual([1, 2, 3]);
  });

  it("passes index to the callback", async () => {
    const items = ["a", "b", "c"];
    const results = await mapWithConcurrency(items, async (_item, index) => index);

    expect((results[0] as PromiseFulfilledResult<number>).value).toBe(0);
    expect((results[1] as PromiseFulfilledResult<number>).value).toBe(1);
    expect((results[2] as PromiseFulfilledResult<number>).value).toBe(2);
  });

  it("uses DEFAULT_CONCURRENCY when not specified", async () => {
    expect(DEFAULT_CONCURRENCY).toBe(5);

    let running = 0;
    let maxRunning = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);

    await mapWithConcurrency(items, async (n) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return n;
    });

    expect(maxRunning).toBe(DEFAULT_CONCURRENCY);
  });

  it("handles single item", async () => {
    const results = await mapWithConcurrency([42], async (n) => n * 2);
    expect(results).toHaveLength(1);
    expect((results[0] as PromiseFulfilledResult<number>).value).toBe(84);
  });
});
