import { join } from "https://deno.land/std@0.152.0/path/mod.ts";

const obj = JSON.parse(
  await Deno.readTextFile(join(Deno.cwd(), "./package.json")),
);

const version = Number(obj.version.split(".").join(""));
obj.version = (version + 1).toString().split("").join(".");

await Deno.writeTextFile(
  join(Deno.cwd(), "package.json"),
  JSON.stringify(obj, null, 2),
);
