/**
 * Agent Tool Packager (ATP) CLI entry: registers subcommands and parses `process.argv`.
 */

import { Command } from "commander";

import { registerAgentCommands } from "./commands/agent.js";
import { registerCatalogCommands } from "./commands/catalog.js";
import { registerCreateCommands } from "./commands/create.js";
import { registerInstallCommand } from "./commands/install.js";
import { registerPackageCommands } from "./commands/package.js";
import { registerRemoveCommands } from "./commands/remove.js";
import { registerSafehouseCommands } from "./commands/safehouse.js";
import { registerStationCommands } from "./commands/station.js";
import { registerValidateCommands } from "./commands/validate.js";
import { isStandaloneLatestArgv } from "./cli/standalone-latest-argv.js";
import { maybePrintUpdateNotice, printLatestVersusCurrent } from "./cli/update-notice.js";
import { atp_version } from "./version.js";

const greetingMessage = `
    AA      GGGGG    EEEEEEE  NN    NN  TTTTTTTT      TTTTTTTT     OOOO        OOOO     LL         SSSS
  AAAAAA   GG    GG  EE       NNN   NN  T  TT  T      T  TT  T   OOOOOOOO    OOOOOOOO   LL        SS  SS
 AA    AA  GG        EE       NNNN  NN     TT            TT     OO      OO  OO      OO  LL       SS    SS
 AA    AA  GG        EEEEE    NNNN  NN     TT            TT     OO      OO  OO      OO  LL       SS
 AA    AA  GG  GGGG  EEEEE    NN NN NN     TT            TT     OO      OO  OO      OO  LL        SSS
 AAAAAAAA  GG  G GG  EE       NN  NNNN     TT     ##     TT     OO      OO  OO      OO  LL         SSS
 AAAAAAAA  GG    GG  EE       NN  NNNN     TT     ##     TT     OO      OO  OO      OO  LL           SSS
 AA    AA   GG  GG   EE       NN    NN     TT            TT     OO      OO  OO      OO  LL             SS
 AA    AA    GGGG    EEEEEEE  NN    NN     TT            TT     OO      OO  OO      OO  LL       SS    SS
 AA    AA ==========================================     TT      OOOOOOOO    OOOOOOOO   LL        SS  SS
 AA    AA    By Warwick Molloy Melbourne, Australia      TT        OOOO        OOOO     LLLLLLLL   SSSS

CLI for agentic software development workflows`;


const program = new Command();

program
  .name("atp")
  .description(greetingMessage)
  .version(atp_version())
  .option(
    "--latest",
    "Show latest published package version vs current, then exit"
  );

registerStationCommands(program);
registerSafehouseCommands(program);
registerRemoveCommands(program);
registerAgentCommands(program);
registerInstallCommand(program);
registerCatalogCommands(program);
registerCreateCommands(program);
registerPackageCommands(program);
registerValidateCommands(program);

program.hook("preAction", async () => {
  await maybePrintUpdateNotice();
});

/**
 * Parse argv and run the matching subcommand (Commander).
 */
async function main(): Promise<void> {
  if (isStandaloneLatestArgv(process.argv)) {
    const code = await printLatestVersusCurrent();
    process.exit(code);
  }
  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
