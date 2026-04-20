import { install } from "./generate.js";

const command = process.argv[2];

if (command === "install") {
  install();
} else {
  console.log("Usage: marker-hooks install");
  console.log("  Installs Marker hook scripts in the current repo.");
  process.exit(1);
}
