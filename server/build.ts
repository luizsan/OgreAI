import { readdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';

async function getTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const folders = ['./api'];
const entrypoints = ['./index.ts'];
for (const folder of folders) {
  entrypoints.push(...await getTsFiles(folder));
}

const command = `bun build --compile ${entrypoints.join(' ')} --outfile server`;
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  console.log(stdout);
  console.error(stderr);
});