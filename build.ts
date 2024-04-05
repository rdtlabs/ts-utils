import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

await emptyDir("./npm");

await build({
  importMap: "./deno.json",
  entryPoints: ["./src/index.ts",
    {
      name: "./src/async",
      path: "./src/async/index.ts",
    }, {
      name: "./src/buffer",
      path: "./src/buffer/index.ts",
    }, {
      name: "./src/cancellation",
      path: "./src/cancellation/index.ts",
    }, {
      name: "./src/crypto",
      path: "./src/crypto/index.ts",
    }, {
      name: "./src/errors",
      path: "./src/errors/index.ts",
    }],
  compilerOptions: {
    lib: ["ESNext", "DOM"],
  },
  test: false,
  outDir: "./npm",
  packageManager: "pnpm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    // package.json properties
    name: "rdt-utils",
    version: Deno.args[0],
    description: "Library of typescript utilities",
    license: "MIT"
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("./LICENSE", "./npm/LICENSE");
    Deno.copyFileSync("./README.md", "./npm/README.md");
    Deno.copyFileSync("./.npmignore", "./npm/.npmignore");
  },
});
