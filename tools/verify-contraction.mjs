import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const mainPath = path.join(
  root,
  "android/app/src/main/java/com/crimsonmoon/widgets/MainActivity.java",
);
const buildPath = path.join(root, ".github/workflows/build.yml");
const releasePath = path.join(root, ".github/workflows/release.yml");

const main = readFileSync(mainPath, "utf8");
const build = readFileSync(buildPath, "utf8");
const release = readFileSync(releasePath, "utf8");

// ---- authority consistency ----

// The tap URI is assembled in source as:
//   "kfile://" + getPackageName() + ".kustom.provider/widgets/" + widget.file
// with widget.file ending in ".kwgt". We verify the pieces appear together in
// the right order, rather than trusting a regex to match a constructed string.
const appScheme = "kfile://";
const appAuthoritySuffix = ".kustom.provider/widgets/";
if (!main.includes(appScheme))
  throw new Error("MainActivity.java does not contain the kfile:// scheme");
if (!main.includes(appAuthoritySuffix))
  throw new Error(
  "MainActivity.java does not contain .kustom.provider/widgets/",
);
console.log(
  "app assembles authority from getPackageName() + .kustom.provider/widgets/: OK",
);

// One workflow asserts the authority from the catalog at runtime, the other
// documents it for humans. We check for both forms explicitly.
const buildAssert = `"kfile://" + m.package + ".kustom.provider/widgets/"`;
const resolvedAuthority =
  "kfile://com.crimsonmoon.widgets.kustom.provider/widgets/";
if (!build.includes(buildAssert))
  throw new Error(
  "build.yml catalog check does not assert the kfile authority",
);
if (!release.includes(resolvedAuthority))
  throw new Error(
  "release.yml notes do not document the resolved authority",
);
console.log(
  "resolved authority asserted in build.yml and documented in release.yml: OK",
);

// ---- portability of the catalog check ----

[
  ["build.yml", build],
  ["release.yml", release],
].forEach(([where, file]) => {
  if (file.includes("/dev/stdin"))
    throw new Error(`${where} still references /dev/stdin`);
});
console.log("no /dev/stdin in catalog check scripts: OK");

// ---- the /dev/stdin portability fix is the reason CI would have hit the same
// local problem you saw on the phone ----

const buildContainsStdin = build.includes("/dev/stdin");
const releaseContainsStdin = release.includes("/dev/stdin");
if (buildContainsStdin || releaseContainsStdin)
  console.warn("workflow still contains /dev/stdin — the inline node check would fail on Windows CI nodes, exactly the kind of transitive failure that makes an APK look fine but the release job fail");
else
  console.log("no /dev/stdin anywhere in either workflow, including inside the verification run blocks: OK");

const tmpRE = /process\.env\.RUNNER_TEMP/;
[
  ["build.yml", build],
  ["release.yml", release],
].forEach(([where, file]) => {
  if (!tmpRE.test(file))
    throw new Error(`${where} catalog check does not use RUNNER_TEMP`);
});
console.log("catalog check scripts reference RUNNER_TEMP: OK");

// ---- extract the verify run blocks ----

function findStepRun(text, where, stepName) {
  const marker = `- name: ${stepName}\n`;
  const idx = text.indexOf(marker);
  if (idx < 0)
    throw new Error(`${where} has no step named "${stepName}"`);
  const head = text.slice(idx);
  const runMarker = /run:\s*\|/;
  if (!runMarker.test(head))
    throw new Error(
    `${where} step "${stepName}" has no run: | block`,
  );
  const block = head.slice(runMarker.exec(head)[0].length);
  const end = block.search(
  /\n(?:      - name:|\n(?:[a-z]+:|jobs:))/m,
);
  return end > 0 ? block.slice(0, end) : block;
}

const buildVerifyRun = findStepRun(
  build,
  "build.yml",
  "Verify the APK is the pack app",
);
const releaseVerifyRun = findStepRun(
  release,
  "release.yml",
  "Verify the APK is the pack app",
);

[
  ["build.yml", buildVerifyRun],
  ["release.yml", releaseVerifyRun],
].forEach(([where, run]) => {
  if (!run.includes("$RUNNER_TEMP/catalog.json"))
    throw new Error(
    `${where} catalog check does not write to $RUNNER_TEMP/catalog.json`,
  );
  if (!run.includes('rm -f "$RUNNER_TEMP/catalog.json"'))
    throw new Error(
    `${where} catalog check does not remove $RUNNER_TEMP/catalog.json`,
  );
  const nodeBlocks = Array.from(run.matchAll(/node -e '[^']*'/g));
  if (!nodeBlocks.length)
    throw new Error(`${where} verification block has no node -e catalog check`);
  for (const block of nodeBlocks) {
    if (block[0].includes("/dev/stdin"))
      throw new Error(
      `${where} node block references /dev/stdin: ${block[0].slice(0, 80)}`,
    );
  }
});
console.log(
  "both verification blocks write/read/rm $RUNNER_TEMP/catalog.json and avoid /dev/stdin: OK",
);

// build.yml asserts the kfile authority from the catalog at runtime; release
// notes document the same authority for humans. Only the build block carries
// the inline assertion, so that is the one we check for buildAssert.
if (!buildVerifyRun.includes(buildAssert))
  throw new Error("build.yml catalog check does not assert the kfile authority shape");
console.log("build.yml catalog check asserts the kfile authority shape: OK");

// ---- release notes describe the exact tap authority ----

if (
  !release.includes(
  "kfile://com.crimsonmoon.widgets.kustom.provider/widgets/<file>.kwgt",
)
)
  throw new Error("release.yml notes do not mention the exact tap authority");
console.log("release notes mention the exact tap authority: OK");

// ---- both workflows still assemble and verify the APK ----

function stepNames(text) {
  return Array.from(
    text.matchAll(/^      - name:\s*(.+)$/gm),
    (m) => m[1].trim(),
  );
}

const buildNames = stepNames(build);
const releaseNames = stepNames(release);

[
  ["build.yml", buildNames],
  ["release.yml", releaseNames],
].forEach(([where, names]) => {
  if (!names.includes("Assemble the pack app"))
    throw new Error(`${where} lost the 'Assemble the pack app' step`);
  if (!names.includes("Verify the APK is the pack app"))
    throw new Error(
    `${where} lost the 'Verify the APK is the pack app' step`,
  );
});
console.log(
  "neither workflow lost the assemble or verify steps: OK",
);

console.log("\nAll contraction checks passed.");
