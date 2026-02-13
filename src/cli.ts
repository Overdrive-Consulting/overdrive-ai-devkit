#!/usr/bin/env node

import { runInit } from "./commands/init";
import { runUpdate, runCheck } from "./commands/update";
import { runAdd } from "./commands/add";
import { runRemove } from "./commands/remove";
import { runList } from "./commands/list";
import { runFind } from "./commands/find";
import { runCreate } from "./commands/create";
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
      await runUpdate(args.slice(1));
      break;

    case "check":
      await runCheck(args.slice(1));
      break;

    case "add":
    case "install":
    case "i":
      await runAdd(args.slice(1));
      break;

    case "remove":
    case "rm":
      await runRemove(args.slice(1));
      break;

    case "list":
    case "ls":
      await runList(args.slice(1));
      break;

    case "find":
    case "search":
      await runFind(args.slice(1));
      break;

    case "create":
      await runCreate(args.slice(1));
      break;

    case "help":
    case "--help":
    case "-h":
      await printBanner();
      printInfo("Usage: adk <command>\n");
      printInfo("Commands:");
      printInfo("  init                  Bootstrap AI tools into current project (default)");
      printInfo("  add <type> <source>   Install skill/command/rule/mcp from source");
      printInfo("  remove <type> [name]  Remove installed assets");
      printInfo("  list [type]           List installed assets");
      printInfo("  find [query]          Search skills.sh for skills");
      printInfo("  create <type> [name]  Scaffold a new skill/command/rule");
      printInfo("  check                 Check for available updates (GitHub-sourced)");
      printInfo("  update                Update outdated skills from GitHub");
      printInfo("  help                  Show this help message");
      printInfo("");
      printInfo("Aliases:");
      printInfo("  install, i            Alias for add");
      printInfo("  rm                    Alias for remove");
      printInfo("  ls                    Alias for list");
      printInfo("  search                Alias for find");
      printInfo("");
      printInfo("Examples:");
      printInfo("  adk add skill owner/repo");
      printInfo("  adk add skill ./local-skills");
      printInfo("  adk remove skill debug");
      printInfo("  adk list skill");
      printInfo("  adk find auth");
      printInfo("  adk create skill my-skill");
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
