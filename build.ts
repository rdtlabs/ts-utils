import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";
import { moveSync, copySync } from "https://deno.land/x/std/fs/mod.ts";

await emptyDir("./dist");
await emptyDir("./npm");

await build({
  scriptModule: false,
  importMap: "./deno.json",
  typeCheck: "both",
  entryPoints: ["./src/index.ts",
    {
      name: "./async",
      path: "./src/async/index.ts",
    }, {
      name: "./buffer",
      path: "./src/buffer/index.ts",
    }, {
      name: "./cancellation",
      path: "./src/cancellation/index.ts",
    }, {
      name: "./crypto",
      path: "./src/crypto/index.ts",
    }, {
      name: "./errors",
      path: "./src/errors/index.ts",
    }],
  declaration: 'inline',
  compilerOptions: {
    sourceMap: true,
    lib: ["ESNext", "DOM"],
  },
  test: false,
  outDir: "./npm",
  packageManager: "pnpm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
    timers: true
  },
  package: {
    // package.json properties
    name: "rdt-utils",
    version: Deno.args[0],
    description: "Library of typescript utilities",
    license: "MIT"
  },
  postBuild() {
    moveSync("./npm/esm", "./dist", { overwrite: true });

    Deno.writeTextFileSync("./dist/package.json",
      Deno
        .readTextFileSync("./npm/package.json")
        .replaceAll('./esm/', './')
    );

    Deno.removeSync("./npm", { recursive: true });
    Deno.copyFileSync("./LICENSE", "./dist/LICENSE");
    Deno.copyFileSync("./README.md", "./dist/README.md");
    Deno.copyFileSync("./.npmignore", "./dist/.npmignore");
  }
});