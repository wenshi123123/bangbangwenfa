import assert from 'node:assert/strict';
import { presentGuardianWithdrawal } from '../src/lib/admin/guardian-withdrawal-presenter';

const view = presentGuardianWithdrawal({
  id: 12,
  guardian_id: 88,
  amount: 12345,
  status: 'pending',
  bank_name: '中国工商银行',
  bank_account: '6222 1234 5678 9012',
  bank_username: '张三',
  remark: '财务已知晓',
  created_at: '2026-07-07T00:00:00.000Z',
  processed_at: null,
});

assert.equal(view.id, 12);
assert.equal(view.guardian_id, 88);
assert.equal(view.amount, 12345);
assert.equal(view.bank_name, '中国工商银行');
assert.equal(view.bank_account, '6222 1234 5678 9012');
assert.equal(view.bank_username, '张三');
assert.equal(view.admin_note, '财务已知晓');
assert.equal(view.processed_at, null);

console.log('admin guardian withdrawal presenter test passed');
