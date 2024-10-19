import { copyFile, readFile, writeFile } from "fs/promises";
import { isArray, isBoolean, isObject, isString } from "ts-json-check";
import { build as unbuild } from "unbuild";

const configFileName = "ts-lib-build.config.json";

const isValidConfig = isObject({
  buildDir: isString,
  dirsToExport: isArray(isString),
  trimReadme: isBoolean,
  fieldsToCopy: isArray(isString),
});

const alwaysCopyingFields = [
  "name",
  "version",
  "description",
  "homepage",
  "author",
  "license",
  "sideEffects",
  "dependencies",
  "peerDependencies",
];

export async function build(forceBuildDir = null) {
  const pkgJsonContent = await readFile("package.json", { encoding: "utf8" });
  const pkgJson = JSON.parse(pkgJsonContent);
  const defaultConfig = {
    buildDir: pkgJson.publishConfig?.directory ?? "./build",
    dirsToExport: [""],
    trimReadme: true,
    fieldsToCopy: [],
  };

  let config = {};

  // Trying to read config from build-ts-lib.config.json
  try {
    const configContent = await readFile(configFileName, { encoding: "utf8" });
    config = JSON.parse(configContent);
  } catch (e) {
    // It's ok if there is no config file
    if (e.code !== "ENOENT") {
      throw e;
    }
  }

  config = { ...defaultConfig, ...config };
  config.fieldsToCopy = [
    ...new Set([...alwaysCopyingFields, ...config.fieldsToCopy]),
  ];

  if (forceBuildDir) {
    config.buildDir = forceBuildDir;
  }

  if (!isValidConfig(config)) {
    throw new Error(`Invalid ${configFileName} structure`);
  }

  const paths = getPaths(config);

  console.log(
    `🏗 Building the "${pkgJson.name}", with export paths: ${JSON.stringify(paths.map((p) => "." + p))}`,
  );

  await unbuild(".", false, {
    declaration: true,
    outDir: config.buildDir,
    clean: true,
    sourcemap: true,
    entries: paths.map((p) => `./src${p}/index`),
    rollup: {
      emitCJS: true,
      esbuild: { target: "esnext" },
    },
    hooks: { "build:done": () => preparePackage(config, pkgJson) },
  });

  console.log("✔ Build done");
}
// -------------------------

async function preparePackage(config, pkgJson) {
  const paths = getPaths(config);
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
      `${config.buildDir}${p}/package.json`,
      JSON.stringify(
        {
          name: `${pkgJson.name}${p}`,
          main: `./index.cjs`,
          module: `./index.mjs`,
          sideEffects: false,
        },
        null,
        2,
      ),
    );
  }

  await writeFile(
    `${config.buildDir}/package.json`,
    JSON.stringify(newPkg, null, 2),
  );
  try {
    await copyFile("LICENSE.txt", `${config.buildDir}/LICENSE.txt`);
  } catch (e) {
    if (e.code !== "ENOENT") {
      throw e;
    }
  }

  if (config.trimReadme && newPkg.homepage) {
    try {
      await writeFile(
        `${config.buildDir}/README.md`,
        `See [package home](${newPkg.homepage}) for actual README`,
      );
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  } else {
    try {
      await copyFile("README.md", `${config.buildDir}/README.md`);
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  }
}

function getPaths(config) {
  return config.dirsToExport.map((path) => (path ? `/${path}` : ""));
}
