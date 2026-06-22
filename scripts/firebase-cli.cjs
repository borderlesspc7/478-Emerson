/**
 * Executa firebase-tools com Node 22 + workaround keepAlive (Windows / Node 19+).
 * Uso: node scripts/firebase-cli.cjs <comando> [args...]
 */
const { spawn } = require('child_process')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const keepalive = path.join(__dirname, 'no-keepalive.cjs')
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Usage: node scripts/firebase-cli.cjs <firebase-args...>')
  process.exit(1)
}

const env = {
  ...process.env,
  NODE_OPTIONS: `--require ${keepalive}`,
}

function quoteArg(value) {
  if (!/[ \t"]/u.test(value)) return value
  return `"${value.replace(/"/g, '\\"')}"`
}

const firebaseCall = [
  'node',
  './node_modules/firebase-tools/lib/bin/firebase.js',
  ...args,
]
  .map(quoteArg)
  .join(' ')

const child =
  process.platform === 'win32'
    ? spawn(`npx --yes --package=node@22.22.3 --call "${firebaseCall}"`, {
        stdio: 'inherit',
        shell: true,
        env,
        cwd: projectRoot,
        windowsHide: false,
      })
    : spawn('npx', ['--yes', '--package=node@22.22.3', '--call', firebaseCall], {
        stdio: 'inherit',
        env,
        cwd: projectRoot,
      })

child.on('error', (err) => {
  console.error('[firebase-cli]', err.message)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
