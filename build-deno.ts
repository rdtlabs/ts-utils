import { build, emptyDir } from "https://deno.land/x/dnt@0.40.0/mod.ts";
import { moveSync } from "https://deno.land/std@0.221.0//fs/mod.ts";

await emptyDir("./jsr");
await emptyDir("./npm");

await build({
  scriptModule: false,
  importMap: "./deno.json",
  typeCheck: "both",
  entryPoints: ["./src/index.ts"],
  declaration: 'separate',
  compilerOptions: {
    sourceMap: true,
    lib: ["ESNext", "DOM"],
  },
  test: false,
  outDir: "./npm",
  packageManager: "pnpm",
  shims: {
    // see JS docs for overview and more options
    deno: false
  },
  package: {
    // package.json properties
    name: "rdt-utils",
    version: Deno.args[0],
    description: "Library of typescript utilities",
    license: "MIT",
    type: "module"
  },
  postBuild() {
    moveSync("./npm/esm", "./jsr", { overwrite: true });

    Deno.writeTextFileSync("./jsr/package.json",
      Deno
        .readTextFileSync("./npm/package.json")
        .replaceAll('./esm/', './')
    );

    Deno.removeSync("./npm", { recursive: true });
    Deno.copyFileSync("./LICENSE", "./jsr/LICENSE");
    Deno.copyFileSync("./README.md", "./jsr/README.md");
    Deno.copyFileSync("./.npmignore", "./jsr/.npmignore");
  }
});