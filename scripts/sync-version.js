import fs from 'node:fs';
import path from 'node:path';

function syncVersion() {
  const versionPath = path.resolve('project-version');
  if (!fs.existsSync(versionPath)) {
    console.error('project-version file not found');
    process.exit(1);
  }

  const version = fs.readFileSync(versionPath, 'utf8').trim();
  console.log(`Syncing project version to ${version}`);

  // Update package.json
  const packageJsonPath = path.resolve('package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.version !== version) {
    packageJson.version = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('Updated package.json');
  }

  // Update README.md
  const readmePath = path.resolve('README.md');
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, 'utf8');
    const versionRegex = /Current Version: \d+\.\d+\.\d+/;
    if (versionRegex.test(readme)) {
      const updatedReadme = readme.replace(versionRegex, `Current Version: ${version}`);
      if (readme !== updatedReadme) {
        fs.writeFileSync(readmePath, updatedReadme);
        console.log('Updated README.md');
      }
    }
  }
}

syncVersion();
