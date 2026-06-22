const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const os = require('os');

console.log('==========================================');
console.log('开始打包部署包...');
console.log('==========================================');

// 定义要排除的文件/目录（支持精确名称和通配符）
const excludePatterns = [
  'node_modules',
  '.pnpm-store',
  '.next',
  '.git',
  '.env',
  '.env.local',
  '.env.production',
  '.vscode',
  '.idea',
  'coverage',
  'dist',
  'build',
  'out',
  '.turbo',
  '.vercel',
  '.coze-logs',
  'tsconfig.tsbuildinfo',
  'public/download',
  'deploy-package.zip',
  'temp-pack.ps1',
  'verify-zip.ps1',
  'scripts/initialize-database.js',
  'scripts/insert-initial-data.js',
  'assets/bangbangwenfa-deploy.zip',
];

// 通配符排除规则
const excludeWildcards = [
  '.env*.local',
  '*.pem',
  '*.p12',
  '*.key',
  '*.log',
  '*.zip',
];

const rootDir = path.resolve(__dirname, '..');
const zipPath = path.join(rootDir, 'deploy-package.zip');
const stagingDir = path.join(os.tmpdir(), 'coze-deploy-staging');

// 删除旧的 ZIP 包
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
  console.log('已删除旧的 deploy-package.zip');
}

/** 判断文件/目录是否应被排除 */
function shouldExclude(relativePath) {
  const parts = relativePath.split(path.sep);
  const basename = path.basename(relativePath);
  
  // 精确排除
  for (const pattern of excludePatterns) {
    if (parts[0] === pattern || relativePath === pattern) return true;
    // 子路径匹配（如 scripts/initialize-database.js）
    if (pattern.includes('/') && relativePath.startsWith(pattern)) return true;
  }
  
  // 通配符排除
  for (const wildcard of excludeWildcards) {
    // *.ext 匹配
    if (wildcard.startsWith('*.')) {
      const ext = wildcard.substring(1); // .pem, .key etc
      if (basename.endsWith(ext)) return true;
    }
    // .env*.local 匹配
    if (wildcard.startsWith('.env*')) {
      if (basename.startsWith('.env') && basename.endsWith('.local')) return true;
    }
  }
  
  return false;
}

/** 递归复制目录，排除指定内容 */
function copyFiltered(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const relativePath = path.relative(rootDir, srcPath);
    
    if (shouldExclude(relativePath)) {
      continue;
    }
    
    const destPath = path.join(destDir, entry.name);
    
    if (entry.isDirectory()) {
      copyFiltered(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // 1. 清理并创建临时目录
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  
  console.log('📁 复制项目文件到临时目录...');
  copyFiltered(rootDir, stagingDir);
  
  // 统计文件数
  let fileCount = 0;
  function countFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        countFiles(fullPath);
      } else {
        fileCount++;
      }
    }
  }
  countFiles(stagingDir);
  console.log(`📊 已复制 ${fileCount} 个文件`);
  
  // 2. 打包 ZIP。Windows 使用 PowerShell，macOS/Linux 使用系统 zip。
  console.log('🗜️ 打包 ZIP...');
  if (process.platform === 'win32') {
    const psScript = `
$source = "${stagingDir.replace(/\\/g, '\\\\')}"
$dest   = "${zipPath.replace(/\\/g, '\\\\')}"
Compress-Archive -Path "$source\\*" -DestinationPath $dest -Force
Write-Host "ZIP written: $dest"
  `.trim();
    const psFile = path.join(os.tmpdir(), 'coze-pack.ps1');
    fs.writeFileSync(psFile, psScript);
    execSync('powershell -ExecutionPolicy Bypass -File ' + psFile, { stdio: 'inherit' });
    fs.unlinkSync(psFile);
  } else {
    execFileSync('zip', ['-qr', zipPath, '.'], {
      cwd: stagingDir,
      stdio: 'inherit',
    });
  }
  
  // 3. 清理临时目录
  fs.rmSync(stagingDir, { recursive: true, force: true });
  
  // 4. 验证
  const stat = fs.statSync(zipPath);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
  
  console.log('==========================================');
  console.log('✅ 打包完成！');
  console.log(`部署包路径: ${zipPath}`);
  console.log(`文件大小:   ${sizeMB} MB`);
  console.log(`文件数量:   ${fileCount} 个`);
  console.log('==========================================');
  console.log('');
  console.log('下一步：');
  console.log('1. 上传 deploy-package.zip 到扣子平台');
  console.log('2. 配置环境变量（参考 DEPLOYMENT_GUIDE.md）');
  console.log('==========================================');
  
} catch (error) {
  // 清理临时目录
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  console.error('❌ 打包失败：', error.message);
  process.exit(1);
}
