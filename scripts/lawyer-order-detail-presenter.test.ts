import assert from 'node:assert/strict';
import { getLawyerOrderResponseText } from '../src/lib/lawyer/order-detail-presenter.ts';

assert.equal(
  getLawyerOrderResponseText('{"content":"已电话联系当事人，等待补充资料"}'),
  '已电话联系当事人，等待补充资料'
);

assert.equal(
  getLawyerOrderResponseText('历史纯文本回复'),
  '历史纯文本回复'
);

assert.equal(getLawyerOrderResponseText(null), '');

console.log('lawyer order detail presenter test passed');
