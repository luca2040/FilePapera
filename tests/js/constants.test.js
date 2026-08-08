import { beforeAll, describe, expect, it } from "vitest";
import { getGlobal, loadScript } from "./helpers/load.js";

beforeAll(() => {
  loadScript("index/utils/constants.js");
});

describe("MD_LANGUAGES", () => {
  it("contains python with .py extension", () => {
    const MD_LANGUAGES = getGlobal("MD_LANGUAGES");
    const py = MD_LANGUAGES.find((l) => l.lang === "python");
    expect(py.ext).toContain("py");
  });

  it("contains dockerfile matched by filename", () => {
    const MD_LANGUAGES = getGlobal("MD_LANGUAGES");
    const docker = MD_LANGUAGES.find((l) => l.lang === "dockerfile");
    expect(docker.name).toContain("Dockerfile");
  });

  it("covers common languages", () => {
    const MD_LANGUAGES = getGlobal("MD_LANGUAGES");
    const langs = MD_LANGUAGES.map((l) => l.lang);
    for (const expected of ["python", "javascript", "typescript", "markdown", "json", "yaml"]) {
      expect(langs).toContain(expected);
    }
  });
});

describe("file view size limits", () => {
  it("defines the text/image/pdf limits", () => {
    expect(getGlobal("MAX_TEXT_FILE_SIZE")).toBe(1 * 1024 * 1024);
    expect(getGlobal("MAX_IMAGE_FILE_SIZE")).toBe(50 * 1024 * 1024);
    expect(getGlobal("MAX_PDF_FILE_SIZE")).toBe(500 * 1024 * 1024);
  });
});
