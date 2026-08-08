import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const SCRIPTS_ROOT = path.resolve(
  "server/flask/app/static/scripts"
);

/**
 * Evaluates a frontend script in the shared global scope, so its top-level
 * functions and constants become accessible to the tests.
 */
export function loadScript(relativePath) {
  const fullPath = path.join(SCRIPTS_ROOT, relativePath);
  const code = readFileSync(fullPath, "utf8");
  vm.runInThisContext(code, { filename: relativePath });
}

/**
 * Reads a binding defined by a previously loaded script. Handles both
 * global properties (function/var declarations) and lexical bindings
 * (const/let), which are not attached to globalThis.
 */
export function getGlobal(name) {
  return vm.runInThisContext(
    `typeof ${name} !== "undefined" ? ${name} : undefined`,
    { filename: `get:${name}` }
  );
}
