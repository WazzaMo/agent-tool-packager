/*
 *  Development installer of ATP for live testing. 
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const ATP_DEV_DIR = '.atp_dev'

const HOME = os.homedir();
const ATP_CLI_HOME = path.join(HOME, ATP_DEV_DIR, 'cli');
const USER_BIN_DIR = path.join(HOME, '.local', 'bin');
const PROJECT_ROOT = process.cwd();

function install() {
  console.log('Starting ATP CLI installation to home directory...');

  // 1. Ensure dist/atp.js exists (requires a build)
  if (!fs.existsSync(path.join(PROJECT_ROOT, 'dist', 'atp.js'))) {
    console.log('Build artifact not found. Running build first...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  // 2. Create destination directories
  fs.mkdirSync(ATP_CLI_HOME, { recursive: true });
  fs.mkdirSync(USER_BIN_DIR, { recursive: true });

  // 3. Copy bin, dist folders and package.json to preserve relative paths and module type
  console.log(`Copying CLI assets to ${ATP_CLI_HOME}...`);
  fs.cpSync(path.join(PROJECT_ROOT, 'bin'), path.join(ATP_CLI_HOME, 'bin'), { recursive: true });
  fs.cpSync(path.join(PROJECT_ROOT, 'dist'), path.join(ATP_CLI_HOME, 'dist'), { recursive: true });
  fs.copyFileSync(path.join(PROJECT_ROOT, 'package.json'), path.join(ATP_CLI_HOME, 'package.json'));

  // 4. Create symlink in ~/.local/bin
  const symlinkTarget = path.join(ATP_CLI_HOME, 'bin', 'atp');
  const symlinkPath = path.join(USER_BIN_DIR, 'atp');

  if (fs.existsSync(symlinkPath)) {
    console.log('Removing existing atp symlink/file...');
    fs.unlinkSync(symlinkPath);
  }

  console.log(`Creating symlink: ${symlinkPath} -> ${symlinkTarget}`);
  fs.symlinkSync(symlinkTarget, symlinkPath);

  // 5. Ensure executable permissions
  fs.chmodSync(symlinkTarget, '755');
  console.log('Permissions set.');

  console.log('\nInstallation complete!');
  console.log('You can now run "atp" from anywhere in your terminal.');
}

install();
