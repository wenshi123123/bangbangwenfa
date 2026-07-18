import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const source = (file: string) => readFile(path.join(process.cwd(), file), 'utf8');

async function main() {
  const [authHook, consultationWizard, civilWizard, styles, promo, lawyerPay] = await Promise.all([
    source('src/hooks/use-auth.tsx'),
    source('src/components/consult/consultation-wizard.tsx'),
    source('src/components/consult/civil-consultation-wizard.tsx'),
    source('src/app/globals.css'),
    source('src/components/lawyer/lawyer-promo-section.tsx'),
    source('src/app/lawyer/pay/page.tsx'),
  ]);

  await access(path.join(process.cwd(), 'src/app/api/auth/session/route.ts'));

  assert.match(authHook, /fetch\('\/api\/auth\/session'/, '顶部登录状态必须向服务端确认令牌');
  assert.match(authHook, /Authorization.*Bearer/, '登录校验必须携带当前令牌');

  for (const wizard of [consultationWizard, civilWizard]) {
    assert.match(wizard, /import \{ useAuth \} from '@\/hooks\/use-auth'/, '咨询流程必须使用统一登录状态');
    assert.match(wizard, /const \{ isLoggedIn, isLoading \} = useAuth\(\)/, '咨询流程不能另起一套登录判断');
    assert.doesNotMatch(wizard, /localStorage\.getItem\('user_info'\)/, '咨询流程不能仅凭本地资料判定已登录');
  }

  assert.doesNotMatch(styles, /\.lawyer-onboarding-theme/, '律师入驻不应再被全局主题覆盖');
  assert.doesNotMatch(promo, /lawyer-onboarding-theme/, '律师入驻首页应恢复原有绿色风格');
  assert.doesNotMatch(lawyerPay, /lawyer-onboarding-theme/, '律师入驻支付页应恢复原有绿色风格');

  console.log('auth session consistency test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
