// Runs the dev reseed through the database's IPv4 address (this laptop's network cannot route IPv6). Prints no secrets.
const fs = require('fs');
const { spawnSync } = require('child_process');
const dns = require('dns');
const raw = (fs.readFileSync('.env', 'utf8').match(/^DATABASE_URL=(.*)$/m) || [])[1];
if (!raw) { console.log('no DATABASE_URL'); process.exit(1); }
let u;
try { u = new URL(raw.trim().replace(/^['"]|['"]$/g, '')); } catch { console.log('DATABASE_URL could not be parsed'); process.exit(1); }
const host = u.hostname;
const endpoint = host.split('.')[0].replace(/-pooler$/, '');
dns.resolve4(host, (err, addrs) => {
  if (err || !addrs.length) { console.log('no IPv4 address for the database host'); process.exit(1); }
  u.hostname = addrs[0];
  u.searchParams.set('options', 'endpoint=' + endpoint);
  console.log('using IPv4', addrs[0], 'endpoint', endpoint.slice(0, 12) + '…');
  const env = { ...process.env, DATABASE_URL: u.toString(), DATABASE_URL_UNPOOLED: u.toString() };
  const r = spawnSync('npx', ['tsx', 'app-scripts/seedApp.ts'], { env, shell: true, encoding: 'utf8' });
  const out = ((r.stdout || '') + (r.stderr || '')).replace(/postgres(ql)?:\/\/\S+/g, '<db-url>');
  console.log(out.split('\n').filter(Boolean).slice(-4).join('\n'));
  process.exit(r.status || 0);
});
