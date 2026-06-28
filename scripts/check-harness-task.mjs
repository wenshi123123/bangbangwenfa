#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const defaultFile = path.resolve(process.cwd(), 'docs/harness-task-template.md');
const targetFile = path.resolve(process.cwd(), process.argv[2] || defaultFile);

const requiredSections = [
  {
    label: '任务信息',
    patterns: [/^##\s+任务信息\s*$/m, /^##\s+Task Info\s*$/m],
  },
  {
    label: '项目地图',
    patterns: [/^##\s+项目地图\s*$/m, /^##\s+Map\s*$/m],
  },
  {
    label: '任务目标',
    patterns: [/^##\s+任务目标\s*$/m, /^##\s+Goal\s*$/m],
  },
  {
    label: '约束',
    patterns: [/^##\s+约束\s*$/m, /^##\s+Constraints\s*$/m],
  },
  {
    label: '验收标准',
    patterns: [/^##\s+验收标准\s*$/m, /^##\s+Acceptance Criteria\s*$/m],
  },
  {
    label: '风险与回滚',
    patterns: [/^##\s+风险与回滚\s*$/m, /^##\s+Risk.*Rollback.*$/m],
  },
  {
    label: '代理拆分',
    patterns: [/^##\s+代理拆分\s*$/m, /^##\s+Multi-agent Split\s*$/m],
  },
  {
    label: '验证计划',
    patterns: [/^##\s+验证计划\s*$/m, /^##\s+Verification Plan\s*$/m],
  },
  {
    label: '开始前自检',
    patterns: [/^##\s+开始前自检\s*$/m, /^##\s+Pre-flight Check\s*$/m],
  },
];

let content;
try {
  content = await readFile(targetFile, 'utf8');
} catch (error) {
  console.error(`❌ 无法读取文件: ${targetFile}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const missing = requiredSections.filter(({ patterns }) => !patterns.some((pattern) => pattern.test(content)));

if (missing.length > 0) {
  console.error(`❌ Harness 检查失败: ${targetFile}`);
  console.error('缺少以下必需章节:');
  for (const section of missing) {
    console.error(`- ${section.label}`);
  }
  process.exit(1);
}

console.log(`✅ Harness 检查通过: ${targetFile}`);
