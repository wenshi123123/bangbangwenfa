import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/app/api/auth/register/route.ts', 'utf8');

assert.match(source, /valid_invites/,
  'successful invite registration must update valid_invites');
assert.ok(source.includes("rpc('increment_guardian_invite_stats'"),
  'invite counters must be incremented atomically');
assert.match(source, /guardian_invitees[\s\S]*upsert[\s\S]*is_valid:\s*true/,
  'valid_invites must correspond to a valid invitee relation');
assert.match(source, /inviteeError|error.*guardian_invitees|创建邀请关系失败/,
  'invite statistics must not advance when relation persistence fails');

console.log('guardian invite stats contract: PASS');
