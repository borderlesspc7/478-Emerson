/**
 * Deploy completo para emerson-1e6d2 com timeout estendido para discovery de Functions no Windows.
 */
const { spawn } = require('child_process')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const env = {
  ...process.env,
  FUNCTIONS_DISCOVERY_TIMEOUT: process.env.FUNCTIONS_DISCOVERY_TIMEOUT || '120000',
  NODE_OPTIONS: `--require ${path.join(__dirname, 'no-keepalive.cjs')}`,
}

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    '--yes',
    '--package=node@22.22.3',
    '--call',
    'node ./node_modules/firebase-tools/lib/bin/firebase.js deploy --project emerson-1e6d2',
  ],
  {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
)

child.on('exit', (code) => process.exit(code ?? 1))
