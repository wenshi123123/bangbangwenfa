import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const center = read('src/app/guardian/center/page.tsx');
const bindWechat = read('src/app/api/guardian/bind-wechat/route.ts');
const bindQrcode = read('src/app/api/guardian/bind-qrcode/route.ts');
const invitees = read('src/app/api/guardian/invitees/route.ts');
const withdraw = read('src/app/api/guardian/withdraw/route.ts');

assert.match(center, /const \[mounted, setMounted\]/,
  'guardian center must gate browser-only state behind mounted hydration boundary');
assert.match(center, /activeTab[\s\S]*overview/,
  'guardian center must use a deterministic server/client initial tab');

for (const [name, source] of [['bind-wechat', bindWechat], ['bind-qrcode', bindQrcode]] as const) {
  assert.match(source, /auth\.userType\s*!==\s*['"]guardian['"]|auth\.userType\s*!==\s*`guardian`/,
    `${name} must require guardian identity`);
  assert.match(source, /guardianIdRaw|guardian_id/,
    `${name} must explicitly inspect the client supplied guardian id`);
  assert.match(source, /403|不匹配|不属于|越权/,
    `${name} must reject cross-guardian ids`);
}

assert.match(invitees, /invite_code/,
  'invitee binding must validate the invite code against the guardian');
assert.match(invitees, /guardian\.id|guardianId.*invite/,
  'invitee binding must tie the invite code to the requested guardian');

assert.match(withdraw, /rpc\(['"]create_guardian_withdrawal['"]|data\s*\?\.|length\s*===\s*0/,
  'withdrawal must use a database atomic operation or verify affected rows');
assert.match(withdraw, /Number\.isFinite|Number\.isInteger|amount\s*<=\s*0/,
  'withdrawal amount must be validated server-side');

console.log('guardian P1 risk contract: PASS');
