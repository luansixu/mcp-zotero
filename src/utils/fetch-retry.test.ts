import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "./fetch-retry.js";

function mockResponse(status: number, headers?: Record<string, string>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 429 ? "Too Many Requests" : status === 503 ? "Service Unavailable" : "OK",
    headers: new Headers(headers),
    json: () => Promise.resolve({}),
  } as Response;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchWithRetry", () => {
  it("returns response on first try if ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200)));

    const promise = fetchWithRetry("https://example.com");
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds on second attempt", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(429))
      .mockResolvedValueOnce(mockResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("https://example.com", undefined, {
      baseDelayMs: 100,
    });

    // Advance past the backoff delay
    await vi.advanceTimersByTimeAsync(200);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("respects numeric Retry-After header", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(429, { "Retry-After": "2" }))
      .mockResolvedValueOnce(mockResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("https://example.com");

    // Default backoff (attempt 0) would be 500-1000ms, so without Retry-After
    // the retry would fire well before 1.9s. Retry-After: 2 forces a 2000ms wait.
    await vi.advanceTimersByTimeAsync(1900);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Should retry after 2s
    await vi.advanceTimersByTimeAsync(200);
    const response = await promise;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("respects Retry-After as HTTP date", async () => {
    // Date 10s in the future. toUTCString() has second precision so actual
    // delay after parsing is 9-10s — still well above the 5s checkpoint.
    const futureDate = new Date(Date.now() + 10_000).toUTCString();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(429, { "Retry-After": futureDate }))
      .mockResolvedValueOnce(mockResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("https://example.com");

    // Default backoff (attempt 0) is 500-1000ms. If the HTTP date parsing
    // were broken (returning null), the fallback backoff would retry in <1s
    // and this assertion at 5s would see 2 calls instead of 1.
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance past the 10s mark — retry should fire
    await vi.advanceTimersByTimeAsync(6000);
    const response = await promise;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses exponential backoff without Retry-After", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(429))
      .mockResolvedValueOnce(mockResponse(429))
      .mockResolvedValueOnce(mockResponse(200));
    vi.stubGlobal("fetch", fetchMock);
    // Seed Math.random to return 0.5 for predictable jitter: delay = base * 2^attempt * (0.5 + 0.5*0.5) = base * 2^attempt * 0.75
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const promise = fetchWithRetry("https://example.com", undefined, {
      baseDelayMs: 100,
    });

    // attempt 0 delay: 100 * 1 * 0.75 = 75ms
    await vi.advanceTimersByTimeAsync(75);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // attempt 1 delay: 100 * 2 * 0.75 = 150ms
    await vi.advanceTimersByTimeAsync(150);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns last 429 response after exhausting maxRetries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(429));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const promise = fetchWithRetry("https://example.com", undefined, {
      maxRetries: 2,
      baseDelayMs: 100,
    });

    // Advance past all retries
    await vi.advanceTimersByTimeAsync(10000);

    const response = await promise;
    expect(response.status).toBe(429);
    // 1 initial + 2 retries = 3 calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry on non-retryable status like 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(404)));

    const response = await fetchWithRetry("https://example.com");

    expect(response.status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 503", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(503))
      .mockResolvedValueOnce(mockResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("https://example.com", undefined, {
      baseDelayMs: 100,
    });

    await vi.advanceTimersByTimeAsync(200);

    const response = await promise;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on network errors (fetch rejects)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    await expect(fetchWithRetry("https://example.com")).rejects.toThrow("Network error");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
