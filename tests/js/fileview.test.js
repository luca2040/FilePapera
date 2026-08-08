import { beforeAll, describe, expect, it } from "vitest";
import { getGlobal, loadScript } from "./helpers/load.js";

beforeAll(() => {
  loadScript("index/utils/constants.js");
  loadScript("index/fileview.js");
});

describe("getLanguageByExtension", () => {
  it("maps .py to python", () => {
    const getLanguageByExtension = getGlobal("getLanguageByExtension");
    expect(getLanguageByExtension("py", "main.py")).toBe("python");
  });

  it("maps .md to markdown", () => {
    const getLanguageByExtension = getGlobal("getLanguageByExtension");
    expect(getLanguageByExtension("md", "README.md")).toBe("markdown");
  });

  it("matches Dockerfile by filename", () => {
    const getLanguageByExtension = getGlobal("getLanguageByExtension");
    expect(getLanguageByExtension("", "Dockerfile")).toBe("dockerfile");
  });

  it("returns null for unknown extensions", () => {
    const getLanguageByExtension = getGlobal("getLanguageByExtension");
    expect(getLanguageByExtension("zzz", "file.zzz")).toBeNull();
  });
});

describe("handleFileOpenExtension", () => {
  it("rejects files above their size limit", () => {
    const handleFileOpenExtension = getGlobal("handleFileOpenExtension");
    const limits = {
      md: getGlobal("MAX_TEXT_FILE_SIZE"),
      png: getGlobal("MAX_IMAGE_FILE_SIZE"),
      pdf: getGlobal("MAX_PDF_FILE_SIZE"),
    };

    for (const [ext, limit] of Object.entries(limits)) {
      const result = handleFileOpenExtension(
        null,
        ext,
        limit + 1,
        "/x",
        `x.${ext}`
      );
      expect(result, `${ext} over limit`).toBeUndefined();
    }
  });

  it("returns a click handler for supported types within limits", () => {
    const handleFileOpenExtension = getGlobal("handleFileOpenExtension");
    const result = handleFileOpenExtension(null, "md", 100, "/x", "x.md");
    expect(typeof result).toBe("function");
  });

  it("returns undefined for unknown extensions", () => {
    const handleFileOpenExtension = getGlobal("handleFileOpenExtension");
    const result = handleFileOpenExtension(null, "zzz", 100, "/x", "x.zzz");
    expect(result).toBeUndefined();
  });
});
