# @davidmz/ts-lib-build

An opinionated builder for the small TypeScript libraries based on 'unbuild'.

This builder compiles the .ts sources into .cjs and .mjs files and copies them
to the _build_ (configurable) folder. It creates a package.json in that folder
without the unneeded fields (like 'devDependencies' or 'scripts') and adds
proper 'exports' field. See below for more information.

## Requirements to project
You code expected to be in the `src` folder. The entry point should be
`index.ts` as well as the entry point of exported sub-folders.

The readme file should be `README.md` and the license file should be
`LICENSE.txt`.

The `homepage` field in the `package.json` should be set to use the "trimReadme"
feature.

It is recommended to use the
`publishConfig.directory` entry in the `package.json` file. It will be used as
the build folder and simplify the publish process (you will only need to run
`npm publish`).

Install it using npm/yarn/pnpm as `@davidmz/ts-lib-build` and run the
`ts-lib-build` command to build.

## Configuration

The builder can work without the configuration file. By default, it will build
the `src/index.ts` to the one file and create the output in the
`publishConfig.directory`, when specified in `package.json`. If it is not
specified, the build will be placed in the `build` folder.

You can create an explicit configuration file named `ts-lib-build.config.json` in the project root. The file structure is as follows (all fields are optional):

```json
{
  // The directory where the build will be placed.
  "buildDir": "build", // default: `publishConfig.directory` or `build`

  // The list of sub-folders to export. Empty string means the `src`
  // folder itself.
  "dirsToExport": [""],

  // Whether to trim the README.md file or include it as is.
  "trimReadme": true,

  // The list of additional fields to copy from the package.json to the 
  // build folder's package.json. Some fields are always copied, see below.
  "fieldsToCopy": []
}
```

The always copied fields of the package.json are:
- "name"
- "version"
- "description"
- "homepage"
- "author"
- "license"
- "sideEffects"
- "dependencies"
- "peerDependencies"
