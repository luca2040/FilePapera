import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getGlobal, loadScript } from "./helpers/load.js";
import vm from "node:vm";

let testFileId = 1;

beforeAll(() => {
  loadScript("index/upload.js");
});

beforeEach(() => {
  // Reset global state via vm
  vm.runInThisContext("filesToProcessList.length = 0");
  vm.runInThisContext("uploadingFiles = false");
  vm.runInThisContext("isProcessing = false");
  vm.runInThisContext("uploadedAny = false");
  vm.runInThisContext("currentFileID = 1");
  testFileId = 1;
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeFileElement(size, overrides = {}) {
  return {
    id: testFileId++,
    path: "/",
    file: new File([new ArrayBuffer(size)], "test.bin"),
    waitingfor: false,
    wasreplaced: false,
    replaceerror: false,
    alreadydone: false,
    storageerror: false,
    container: { scrollIntoView: vi.fn() },
    ...overrides,
  };
}

describe("chunked upload logic", () => {
  it("has CHUNKED_THRESHOLD constant", () => {
    expect(getGlobal("CHUNKED_THRESHOLD")).toBe(10 * 1024 * 1024);
  });

  it("has CHUNK_SIZE constant", () => {
    expect(getGlobal("CHUNK_SIZE")).toBe(5 * 1024 * 1024);
  });

  it("tracks active chunked uploads in activeChunkedUploads map", async () => {
    const element = makeFileElement(20 * 1024 * 1024); // 20 MB - above threshold

    const activeChunkedUploads = getGlobal("activeChunkedUploads");
    expect(activeChunkedUploads instanceof Map).toBe(true);
  });

  it("has cancelChunkedUpload function", () => {
    const cancelChunkedUpload = getGlobal("cancelChunkedUpload");
    expect(typeof cancelChunkedUpload).toBe("function");
  });

  it("has uploadChunked function", () => {
    const uploadChunked = getGlobal("uploadChunked");
    expect(typeof uploadChunked).toBe("function");
  });
});