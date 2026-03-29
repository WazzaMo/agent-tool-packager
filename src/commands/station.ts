/**
 * Station subcommands: `atp station init`, `atp station list`.
 */

import type { Command } from "commander";
import { stationInit } from "../init/station-init.js";
import { stationList } from "../station/list.js";

/**
 * Register Station-related commands on the program.
 *
 * @param program - Root Commander program.
 */
export function registerStationCommands(program: Command): void {
  const station = program
    .command("station")
    .description("Manage the ATP Station (central config and catalog)");

  station
    .command("init")
    .description("Create ~/.atp_station and default config (or use STATION_PATH)")
    .action(async () => {
      await stationInit();
    });

  station
    .command("list")
    .description("List packages installed in the Station")
    .action(() => {
      stationList();
    });
}
