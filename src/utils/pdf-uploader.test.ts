import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadAndUploadPdf } from "./pdf-uploader.js";
import { createZoteroApiMock } from "../__mocks__/zotero-api.mock.js";

vi.mock("./pdf-text-extractor.js", () => ({
  extractPdfText: vi.fn(),
}));

vi.mock("./zotero-fulltext.js", () => ({
  putFulltext: vi.fn(),
}));

const TEST_USER_ID = "12345";
const TEST_API_KEY = "test-api-key";
const pdfBuffer = Buffer.from("fake-pdf-content");

function mockFetchChain(overrides?: {
  download?: Partial<Response>;
  auth?: Record<string, unknown>;
  upload?: Partial<Response>;
  register?: Partial<Response>;
}) {
  const fetchMock = vi.fn();
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    arrayBuffer: () =>
      Promise.resolve(
        pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength)
      ),
    ...overrides?.download,
  });
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve(
        overrides?.auth ?? {
          url: "https://storage.zotero.org/upload",
          contentType: "application/octet-stream",
          prefix: "PREFIX",
          suffix: "SUFFIX",
          uploadKey: "UPLOAD_KEY_123",
        }
      ),
  });
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 201,
    ...overrides?.upload,
  });
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 204,
    ...overrides?.register,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function mockFulltextSuccess() {
  const { extractPdfText } = await import("./pdf-text-extractor.js");
  const { putFulltext } = await import("./zotero-fulltext.js");
  vi.mocked(extractPdfText).mockResolvedValueOnce({ text: "Extracted PDF text", totalPages: 5 });
  vi.mocked(putFulltext).mockResolvedValueOnce({ success: true });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadAndUploadPdf", () => {
  it("successfully downloads and uploads a PDF", async () => {
    mockFetchChain();
    await mockFulltextSuccess();

    const writeData = {
      isSuccess: true,
      data: [{ key: "UP001", title: "paper.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);

    const result = await downloadAndUploadPdf(mock, TEST_USER_ID, TEST_API_KEY, {
      url: "https://example.com/paper.pdf",
    });

    expect(result.success).toBe(true);
    expect(result.itemKey).toBe("UP001");
    expect(result.filename).toBe("paper.pdf");
    expect(result.sizeBytes).toBe(pdfBuffer.length);
    expect(result.fulltextIndexed).toBe(true);
  });

  it("returns error when download fails (network error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("fetch failed"))
    );

    const { mock } = createZoteroApiMock([]);
    const result = await downloadAndUploadPdf(mock, TEST_USER_ID, TEST_API_KEY, {
      url: "https://example.com/paper.pdf",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error downloading file");
  });

  it("returns error when download returns non-200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 403 })
    );

    const { mock } = createZoteroApiMock([]);
    const result = await downloadAndUploadPdf(mock, TEST_USER_ID, TEST_API_KEY, {
      url: "https://example.com/forbidden.pdf",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to download file from URL");
    expect(result.error).toContain("403");
  });

  it("returns error when upload authorization fails", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: () =>
        Promise.resolve(
          pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength)
        ),
    });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetchMock);

    const writeData = {
      isSuccess: true,
      data: [{ key: "UP002", title: "paper.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);

    const result = await downloadAndUploadPdf(mock, TEST_USER_ID, TEST_API_KEY, {
      url: "https://example.com/paper.pdf",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Upload authorization failed");
  });

  it("skips upload when file already exists", async () => {
    const fetchMock = mockFetchChain({ auth: { exists: 1 } });
    await mockFulltextSuccess();

    const writeData = {
      isSuccess: true,
      data: [{ key: "UP003", title: "paper.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);

    const result = await downloadAndUploadPdf(mock, TEST_USER_ID, TEST_API_KEY, {
      url: "https://example.com/paper.pdf",
    });

    expect(result.success).toBe(true);
    expect(result.itemKey).toBe("UP003");
    // Only 2 fetch calls: download + auth (no binary upload or register)
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("handles fulltext extraction failure gracefully", async () => {
    mockFetchChain();

    const { extractPdfText } = await import("./pdf-text-extractor.js");
    vi.mocked(extractPdfText).mockRejectedValueOnce(new Error("Corrupt PDF"));

    const writeData = {
      isSuccess: true,
      data: [{ key: "UP004", title: "paper.pdf" }],
      errors: {},
    };
    const { mock } = createZoteroApiMock([], writeData);

    const result = await downloadAndUploadPdf(mock, TEST_USER_ID, TEST_API_KEY, {
      url: "https://example.com/corrupt.pdf",
    });

    expect(result.success).toBe(true);
    expect(result.fulltextIndexed).toBe(false);
    expect(result.fulltextStatus).toContain("PDF text extraction failed");
  });

  it("creates child attachment with parentItem", async () => {
    mockFetchChain();
    await mockFulltextSuccess();

    const writeData = {
      isSuccess: true,
      data: [{ key: "UP005", title: "paper.pdf" }],
      errors: {},
    };
    const { mock, postStub } = createZoteroApiMock([], writeData);

    await downloadAndUploadPdf(mock, TEST_USER_ID, TEST_API_KEY, {
      url: "https://example.com/paper.pdf",
      parentItem: "PARENT1",
    });

    const postedData = postStub.mock.calls[0][0] as Record<string, unknown>[];
    expect(postedData[0]).toHaveProperty("parentItem", "PARENT1");
    expect(postedData[0]).toHaveProperty("collections", []);
  });
});
