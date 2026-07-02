import assert from 'node:assert/strict';
import {
  getAdminLawyerResponseText,
  getAdminOrderServiceLabel,
} from '../src/lib/admin/order-detail-presenter';

assert.equal(
  getAdminOrderServiceLabel('civil_premium'),
  '民事律师（臻选）',
  'admin order detail should show current lawyer package labels'
);

assert.equal(
  getAdminOrderServiceLabel('criminal_premium'),
  '刑事律师（臻选）',
  'admin order detail should show criminal premium label'
);

assert.equal(
  getAdminLawyerResponseText('{"content":"已联系当事人，准备材料中"}'),
  '已联系当事人，准备材料中',
  'admin order detail should extract content from JSON lawyer response'
);

assert.equal(
  getAdminLawyerResponseText('历史纯文本回复'),
  '历史纯文本回复'
);

console.log('admin order detail presenter test passed');
