/*
 * Uninstall script for ATP development installation.
 * Removes the CLI directory and the symlink in ~/.local/bin/atp.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ATP_DEV_DIR = '.atp_dev';
const HOME = os.homedir();
const ATP_DEV_PATH = path.join(HOME, ATP_DEV_DIR);
const SYMLINK_PATH = path.join(HOME, '.local', 'bin', 'atp');

function uninstall() {
  console.log('Uninstalling ATP development artifacts...');

  // 1. Remove the symlink
  if (fs.existsSync(SYMLINK_PATH)) {
    try {
      const stats = fs.lstatSync(SYMLINK_PATH);
      if (stats.isSymbolicLink()) {
        console.log(`Removing symlink at ${SYMLINK_PATH}...`);
        fs.unlinkSync(SYMLINK_PATH);
      } else {
        console.warn(`Warning: Found a file at ${SYMLINK_PATH} that is not a symlink. Skipping.`);
      }
    } catch (err) {
      console.error(`Error removing symlink: ${err.message}`);
    }
  } else {
    console.log(`Symlink at ${SYMLINK_PATH} not found.`);
  }

  // 2. Remove the atp_dev directory
  if (fs.existsSync(ATP_DEV_PATH)) {
    console.log(`Removing directory at ${ATP_DEV_PATH}...`);
    try {
      fs.rmSync(ATP_DEV_PATH, { recursive: true, force: true });
    } catch (err) {
      console.error(`Error removing directory: ${err.message}`);
    }
  } else {
    console.log(`Directory at ${ATP_DEV_PATH} not found.`);
  }

  console.log('\nUninstallation complete.');
}

uninstall();
