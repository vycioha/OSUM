import { writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if root package.json exists, create one if it doesn't
try {
  writeFileSync(
    join(__dirname, 'package.json'),
    JSON.stringify({
      "name": "osum-revamped",
      "version": "1.0.0",
      "type": "module",
      "scripts": {
        "start": "node server.js"
      }
    }, null, 2),
    { flag: 'wx' }  // wx flag makes it fail if file exists
  );
  console.log('Created package.json');
} catch (err) {
  // File exists, ignore error
  if (err.code !== 'EEXIST') {
    console.error('Error creating package.json:', err);
  }
}

console.log('Starting servers...');

// Start Python backend
const backend = spawn('npm', ['start'], {
  cwd: join(__dirname, 'backend'),
  stdio: 'pipe',
  shell: true
});

// Log backend output
backend.stdout.on('data', (data) => {
  console.log(`[Backend] ${data.toString()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`[Backend Error] ${data.toString()}`);
});

// Start frontend
const frontend = spawn('npm', ['run', 'start:react'], {
  cwd: join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});
