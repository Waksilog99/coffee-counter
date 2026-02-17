import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function exec(command) {
    console.log(`\n> ${command}`);
    execSync(command, { stdio: 'inherit' });
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 1. Build Frontend
console.log('Building Frontend...');
// Use full path to npm to ensure it works
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
exec(`${npmCmd} run build`);

// 2. Prepare Functions
console.log('Preparing Functions...');
const functionsServerDir = path.join(__dirname, 'functions', 'server');

if (fs.existsSync(functionsServerDir)) {
    fs.rmSync(functionsServerDir, { recursive: true, force: true });
}
fs.mkdirSync(functionsServerDir, { recursive: true });

// 3. Copy Server Code
console.log('Copying Server Code...');
const serverSrc = path.join(__dirname, 'server');
const serverDest = functionsServerDir;

// Copy app.js
fs.copyFileSync(path.join(serverSrc, 'app.js'), path.join(serverDest, 'app.js'));

// Copy db folder
copyDir(path.join(serverSrc, 'db'), path.join(serverDest, 'db'));

// 4. Install Functions Dependencies
console.log('Installing Functions Dependencies...');
process.chdir(path.join(__dirname, 'functions'));
exec(`${npmCmd} install`);
process.chdir(__dirname);

// 5. Deploy
console.log('Deploying to Firebase...');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
exec(`${npxCmd} firebase deploy`);
