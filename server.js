import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
