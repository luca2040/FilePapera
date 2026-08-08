import { beforeAll, describe, expect, it } from "vitest";
import { getGlobal, loadScript } from "./helpers/load.js";

beforeAll(() => {
  loadScript("index/ui/functions.js");
  loadScript("index/utils/page.js");
});

describe("formatFileSize", () => {
  it("formats zero bytes", () => {
    expect(getGlobal("formatFileSize")(0)).toBe("0 B");
  });

  it("formats plain bytes", () => {
    expect(getGlobal("formatFileSize")(512)).toBe("512.00&nbsp;B");
  });

  it("formats kilobytes", () => {
    expect(getGlobal("formatFileSize")(1024)).toBe("1.00&nbsp;KB");
  });

  it("formats megabytes", () => {
    expect(getGlobal("formatFileSize")(1024 * 1024)).toBe("1.00&nbsp;MB");
  });

  it("formats gigabytes", () => {
    expect(getGlobal("formatFileSize")(1024 ** 3)).toBe("1.00&nbsp;GB");
  });
});

describe("getSubPaths", () => {
  it("builds every subpath of the given path", () => {
    expect(getGlobal("getSubPaths")("/folder/subfolder/file")).toEqual([
      "/folder",
      "/folder/subfolder",
      "/folder/subfolder/file",
    ]);
  });

  it("handles a missing leading slash", () => {
    expect(getGlobal("getSubPaths")("a/b")).toEqual(["/a", "/a/b"]);
  });

  it("returns an empty list for the root", () => {
    expect(getGlobal("getSubPaths")("/")).toEqual([]);
  });
});
