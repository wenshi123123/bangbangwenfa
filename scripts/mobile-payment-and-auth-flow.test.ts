import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

async function readSource(relativePath: string) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function main() {
  const [lawyerPayPage, lawyerPayCreate, loginModal, authHook, homePage, lawyerForm, lawyerCreate, civilDescription] = await Promise.all([
    readSource('src/app/lawyer/pay/page.tsx'),
    readSource('src/app/api/lawyer/pay/create/route.ts'),
    readSource('src/components/auth/login-modal.tsx'),
    readSource('src/hooks/use-auth.tsx'),
    readSource('src/app/page.tsx'),
    readSource('src/components/lawyer/lawyer-form-step.tsx'),
    readSource('src/app/api/lawyer/create/route.ts'),
    readSource('src/components/consult/civil-description-step.tsx'),
  ]);

  assert.match(lawyerPayPage, /'x-client-device': isMobile \? 'mobile' : 'web'/, '律师支付必须告诉服务端当前是移动端还是电脑端');
  assert.match(lawyerPayPage, /headers\['Authorization'\] = `Bearer \$\{token\}`/, '律师支付必须携带登录凭证');
  assert.match(lawyerPayPage, /WECHAT_OAUTH_REQUIRED/, '律师支付必须在微信内缺少授权时进入微信授权');
  assert.match(lawyerPayPage, /setOrderId\(orderIdFromServer\);[\s\S]*?window\.location\.href = h5Url/, 'H5 支付跳转前必须保存订单号，便于回跳后查询状态');
  assert.match(lawyerPayCreate, /const \{ channel \} = getPaymentClientContext\(request\)/, '律师支付服务端必须按渠道创建支付单');
  assert.match(lawyerPayCreate, /channel === 'jsapi'/, '律师支付必须支持微信内 JSAPI');
  assert.match(lawyerPayCreate, /channel === 'h5'/, '律师支付必须支持外部手机浏览器 H5');

  assert.doesNotMatch(loginModal, /userType === "lawyer" \? "\/lawyer" : userType === "guardian" \? "\/guardian\/center" : null/, '普通登录不应按身份跳去中心页');
  assert.match(loginModal, /authGuardRedirect \|\|\s*modalRedirect \|\|\s*'\/'/, '普通登录应回首页，流程登录应优先返回原页面');
  assert.match(authHook, /isTokenUsable/, '展示登录状态前必须先检查本地 token 是否仍可用');

  assert.match(homePage, /heroImages\.map\(\(img, i\) => \(/, '轮播主图应预先挂载，避免切换时临时下载');
  assert.match(homePage, /currentImage === i \? "opacity-100 z-10" : "opacity-0 z-0"/, '轮播主图应只切换透明度');

  assert.match(lawyerForm, /replace\(\/\\D\/g, ''\)\.slice\(0, 11\)/, '律师联系电话输入必须只保留 11 位数字');
  assert.match(lawyerForm, /maxLength=\{11\}/, '律师联系电话输入必须限制为 11 位');
  assert.match(lawyerCreate, /!\/\^\\d\{11\}\$\/.test\(phone\)/, '服务端也必须拒绝不符合 11 位数字规则的联系电话');
  assert.match(civilDescription, /手机号码（必填）/, '民事咨询页面必须显示手机号必填');
  assert.doesNotMatch(civilDescription, /手机号码（选填）/, '民事咨询页面不能再显示手机号选填');

  console.log('mobile payment and auth flow test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
