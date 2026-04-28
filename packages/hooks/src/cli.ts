import { install, regenerateSettings } from "./generate.js";

const command = process.argv[2];

if (command === "install") {
  install();
} else if (command === "regenerate-settings") {
  regenerateSettings();
} else {
  console.log("Usage: marker-hooks <command>");
  console.log("");
  console.log("Commands:");
  console.log("  install                Installs Marker hook scripts in the current repo.");
  console.log("  regenerate-settings    Force-regenerate .claude/settings.json from defaults.");
  process.exit(1);
}
