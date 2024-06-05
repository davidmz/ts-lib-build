import { copyFileSync, readFile, writeFile } from "fs/promises";
import { build } from "unbuild";

const pkjJsonConfKey = "buildTsLib";
const configFileName = "build-ts-lib.config.json";

const pkgJsonContent = await readFile("package.json", { encoding: "utf8" });
const pkgJson = JSON.parse(pkgJsonContent);

const defaultConfig = {
  buildDir: pkgJson.publishConfig?.directory ?? "./build",
  exports: [""],
  trimReadme: true,
  fieldsToCopy: [
    "name",
    "version",
    "description",
    "homepage",
    "author",
    "license",
    "sideEffects",
    "dependencies",
  ],
};

let config = {};

if (pkgJson[pkjJsonConfKey]) {
  config = pkgJson[pkjJsonConfKey];
} else {
  // If there is no config in package.json, try to read it from build-ts-lib.config.json
  try {
    const configContent = await readFile(configFileName, { encoding: "utf8" });
    config = JSON.parse(configContent);
  } catch (e) {
    // It's ok if there is no config file
    if (e.code !== "ENOENT") {
      throw e;
    }
  }
}

config = { ...defaultConfig, ...config };

const paths = config.exports.map((path) => (path ? `/${path}` : ""));

const ubConfig = {
  declaration: true,
  outDir,
  clean: true,
  sourcemap: true,
  entries: paths.map((p) => `./src${p}/index`),
  rollup: {
    emitCJS: true,
  },
  hooks: { "build:done": preparePackage },
};

await build(".", false, ubConfig);

console.log("✔ Done");

// -------------------------

async function preparePackage() {
  const newPkg = {};
  for (const f of config.fieldsToCopy) {
    if (f in pkgJson) {
      newPkg[f] = pkgJson[f];
    }
  }

  newPkg.main = `./index.cjs`;
  newPkg.module = `./index.mjs`;

  newPkg.exports = {};
  for (const p of paths) {
    newPkg.exports[`.${p}`] = {
      require: `.${p}/index.cjs`,
      import: `.${p}/index.mjs`,
    };

    if (p === "") {
      continue;
    }

    // Create per-dir package.json for IDEs
    await writeFile(
      `${outDir}${p}/package.json`,
      JSON.stringify(
        {
          name: `${pkgJson.name}${p}`,
          main: `./index.cjs`,
          module: `./index.mjs`,
          sideEffects: false,
        },
        null,
        2
      )
    );
  }

  await writeFile(`${outDir}/package.json`, JSON.stringify(newPkg, null, 2));
  try {
    await copyFile("LICENSE.txt", `${outDir}/LICENSE.txt`);
  } catch (e) {
    if (e.code !== "ENOENT") {
      throw e;
    }
  }

  if (config.trimReadme && newPkg.homepage) {
    try {
      await writeFile(
        `${outDir}/README.md`,
        `See [package home](${newPkg.homepage}) for actual README`
      );
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  } else {
    try {
      await copyFile("README.md", `${outDir}/README.md`);
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  }
}
