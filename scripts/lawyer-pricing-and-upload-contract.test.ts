import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = (file: string) => readFile(path.join(root, file), 'utf8');

async function main() {
  const [uploadStep, createRoute, priceRoute, renewRoute, renewCallback, renewPage, migration] = await Promise.all([
    source('src/components/lawyer/lawyer-upload-step.tsx'),
    source('src/app/api/lawyer/create/route.ts'),
    source('src/app/api/price/route.ts'),
    source('src/app/api/lawyer/renew/route.ts'),
    source('src/app/api/lawyer/renew/callback/route.ts'),
    source('src/app/lawyer/renew/page.tsx'),
    source('scripts/init-database-full.sql'),
  ]);

  assert.match(uploadStep, /getMissingRequirements/, '上传页必须从当前 2\/3\/1 规则计算缺少的资料');
  assert.match(uploadStep, /disabled=\{!isFormValid\(\)/, '资料不足时下一步按钮必须不可点击');
  assert.match(uploadStep, /还缺/, '资料不足时必须提示缺少数量');
  assert.match(createRoute, /validateUploadRequirements/, '创建申请接口必须复核资料数量');
  assert.match(createRoute, /loadLawyerPackagePrices/, '创建申请接口必须由服务端读取套餐价格');
  assert.doesNotMatch(createRoute, /packagePrice\s*,\s*selectedPackages/, '创建申请接口不得从请求体接受客户端 packagePrice');
  assert.doesNotMatch(priceRoute, /category: 'lawyer'.*price:/, '公开价格接口不得为律师入驻回退到写死金额');

  assert.match(renewRoute, /RENEWAL_PACKAGE_META/, '续费接口必须保留仅含时长/类型的套餐元数据');
  assert.match(renewRoute, /loadRenewalPackagePrice/, '续费接口必须读取后台价格配置');
  assert.match(renewRoute, /resolveUserNickname/, '续费通知必须使用账户昵称');
  assert.match(renewCallback, /Number\(order\.package_price\) !== paidAmount/, '续费回调必须校验付款金额');
  assert.doesNotMatch(renewRoute, /civil_renew_6|civil_renew_18|criminal_renew_6|criminal_renew_18/, '旧 6/18 个月续费套餐必须被替换');
  assert.match(renewPage, /\/api\/price\?category=lawyer_renewal/, '续费页必须读取后台价格配置');
  assert.doesNotMatch(renewPage, /civil_renew_6|civil_renew_18|criminal_renew_6|criminal_renew_18/, '续费页不得继续展示旧套餐');
  for (const plan of ['civil_renew_quarter', 'civil_renew_year', 'criminal_renew_quarter', 'criminal_renew_year']) {
    assert.match(migration, new RegExp(plan), `初始化脚本必须包含 ${plan} 的后台价格配置`);
  }

  console.log('lawyer pricing and upload contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
