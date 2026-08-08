import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getGlobal, loadScript } from "./helpers/load.js";

beforeAll(() => {
  loadScript("index/upload.js");
});

beforeEach(() => {
  // Mimic the real updateUploadElement, which marks the item as done when
  // the upload finishes.
  globalThis.updateUploadElement = vi.fn(async (item) => {
    item.alreadydone = true;
  });
  globalThis.reloadFilesRequest = vi.fn().mockResolvedValue(undefined);
});

afterEach(() => {
  setUploadList([]);
  vi.restoreAllMocks();
});

function makeItem(id, overrides = {}) {
  return {
    id,
    path: "/",
    file: new File([""], "f.txt"),
    waitingfor: false,
    wasreplaced: false,
    replaceerror: false,
    alreadydone: false,
    storageerror: false,
    container: { scrollIntoView: vi.fn() },
    ...overrides,
  };
}

function setUploadList(items) {
  getGlobal("filesToProcessList").splice(0, Infinity, ...items);
}

describe("getNextReadyFile", () => {
  it("returns the first ready file", () => {
    setUploadList([
      makeItem(1, { waitingfor: true }),
      makeItem(2),
      makeItem(3, { alreadydone: true }),
    ]);
    expect(getGlobal("getNextReadyFile")().id).toBe(2);
  });

  it("returns undefined when nothing is ready", () => {
    setUploadList([
      makeItem(1, { waitingfor: true }),
      makeItem(2, { replaceerror: true }),
      makeItem(3, { storageerror: true }),
      makeItem(4, { alreadydone: true }),
    ]);
    expect(getGlobal("getNextReadyFile")()).toBeUndefined();
  });
});

describe("processUploadQueue", () => {
  it("uploads ready files serially and reloads the list once", async () => {
    const uploaded = [];
    globalThis.updateUploadElement = async (item) => {
      item.alreadydone = true;
      uploaded.push(item.id);
    };

    setUploadList([makeItem(1), makeItem(2), makeItem(3)]);

    await getGlobal("processUploadQueue")();

    expect(uploaded).toEqual([1, 2, 3]);
    expect(globalThis.reloadFilesRequest).toHaveBeenCalledTimes(1);
    expect(getGlobal("uploadingFiles")).toBe(false);
    expect(getGlobal("isProcessing")).toBe(false);
  });

  it("does not reload when nothing was uploaded", async () => {
    setUploadList([]);

    await getGlobal("processUploadQueue")();

    expect(globalThis.updateUploadElement).not.toHaveBeenCalled();
    expect(globalThis.reloadFilesRequest).not.toHaveBeenCalled();
  });

  it("does nothing when all files are blocked", async () => {
    setUploadList([
      makeItem(1, { waitingfor: true }),
      makeItem(2, { replaceerror: true }),
      makeItem(3, { storageerror: true }),
      makeItem(4, { alreadydone: true }),
    ]);

    await getGlobal("processUploadQueue")();

    expect(globalThis.updateUploadElement).not.toHaveBeenCalled();
    expect(globalThis.reloadFilesRequest).not.toHaveBeenCalled();
  });

  it("skips blocked files and processes the ready ones", async () => {
    const uploaded = [];
    globalThis.updateUploadElement = async (item) => {
      item.alreadydone = true;
      uploaded.push(item.id);
    };

    setUploadList([makeItem(1, { waitingfor: true }), makeItem(2)]);

    await getGlobal("processUploadQueue")();

    expect(uploaded).toEqual([2]);
    expect(globalThis.reloadFilesRequest).toHaveBeenCalledTimes(1);
  });

  it("processes files that become ready while uploading", async () => {
    const uploaded = [];
    let runs = 0;
    globalThis.updateUploadElement = async (item) => {
      item.alreadydone = true;
      uploaded.push(item.id);
      runs += 1;
      // While uploading the first file, a new one is queued
      if (runs === 1) setUploadList([makeItem(2)]);
    };

    setUploadList([makeItem(1)]);

    await getGlobal("processUploadQueue")();

    expect(uploaded).toEqual([1, 2]);
    expect(globalThis.reloadFilesRequest).toHaveBeenCalledTimes(1);
  });

  it("scrolls the container into view before uploading", async () => {
    const item = makeItem(1);
    setUploadList([item]);

    await getGlobal("processUploadQueue")();

    expect(item.container.scrollIntoView).toHaveBeenCalled();
  });

  it("ignores concurrent calls while processing", async () => {
    const uploaded = [];
    let release;
    let firstCallDone;

    globalThis.updateUploadElement = (item) => {
      uploaded.push(item.id);
      return new Promise((resolve) => {
        release = () => {
          item.alreadydone = true;
          resolve();
        };
      });
    };

    setUploadList([makeItem(1)]);
    const firstRun = getGlobal("processUploadQueue")();
    firstCallDone = getGlobal("processUploadQueue")(); // should be ignored

    await new Promise((r) => setTimeout(r, 0));
    release();

    await Promise.all([firstRun, firstCallDone]);

    expect(uploaded).toEqual([1]);
    expect(getGlobal("isProcessing")).toBe(false);
  });
});
