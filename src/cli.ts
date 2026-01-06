#!/usr/bin/env bun

import { runInit } from "./commands/init";
import { runUpdate } from "./commands/update";
import { printBanner, printError, printInfo } from "./utils/ui";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "init":
    case undefined:
      await runInit();
      break;

    case "update":
      await runUpdate();
      break;

    case "help":
    case "--help":
    case "-h":
      await printBanner();
      printInfo("Usage: adk <command>\n");
      printInfo("Commands:");
      printInfo("  init     Bootstrap AI tools into current project (default)");
      printInfo("  update   Update commands/skills from registry");
      printInfo("  help     Show this help message");
      break;

    default:
      printError(`Unknown command: ${command}`);
      printInfo("Run 'adk help' for usage");
      process.exit(1);
  }
}

main().catch((error) => {
  printError(error.message);
  process.exit(1);
});
