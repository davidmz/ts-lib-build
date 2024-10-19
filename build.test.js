import { compare } from "dir-compare";
import { readdir, rm } from "fs/promises";
import { expect, it } from "vitest";
import { build } from "./build";

const update = process.env.UPDATE === "1";

const entries = await readdir("./test-packages", { withFileTypes: true });
const packages = entries.filter((f) => f.isDirectory()).map((f) => f.name);

for (const pkg of packages) {
  it(`should build a '${pkg}' package`, async () => {
    await testPackageBuild(`./test-packages/${pkg}`, update);
  });
}

async function testPackageBuild(path, update = false) {
  const currentDir = process.cwd();
  process.chdir(path);
  try {
    await build(update ? "./__build" : "./build");
    if (update) {
      return;
    }
    const result = await compare("./build", "./__build", {
      compareContent: true,
    });
    const differences = result.diffSet
      .filter((f) => f.reason)
      .map((f) => ({ name: f.name1, reason: f.reason }));
    expect(differences).toEqual([]);
  } finally {
    process.chdir(currentDir);
    try {
      await rm(`${path}/build`, { recursive: true });
    } catch (e) {
      if (e.code !== "ENOENT") {
        // eslint-disable-next-line no-unsafe-finally
        throw e;
      }
    }
  }
}
