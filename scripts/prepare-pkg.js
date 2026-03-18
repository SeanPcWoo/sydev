import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distPkg = resolve(root, 'dist-pkg');
const rootPkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const cliPkg = JSON.parse(readFileSync(resolve(root, 'apps/cli/package.json'), 'utf-8'));
const corePkg = JSON.parse(readFileSync(resolve(root, 'packages/core/package.json'), 'utf-8'));

// 合并依赖，生成可发布 package.json
const deps = { ...corePkg.dependencies, ...cliPkg.dependencies };
delete deps['@sydev/core']; // 已内联

const publishPkg = {
  name: '@haawpc/sydev',
  version: rootPkg.version,
  description: rootPkg.description,
  type: 'module',
  bin: { sydev: './index.js' },
  engines: rootPkg.engines,
  files: ['index.js'],
  dependencies: deps,
};

writeFileSync(resolve(distPkg, 'package.json'), JSON.stringify(publishPkg, null, 2) + '\n');
console.log('✓ dist-pkg/package.json 已生成');

// 复制 README（如有）
const readme = resolve(root, 'README.md');
if (existsSync(readme)) {
  copyFileSync(readme, resolve(distPkg, 'README.md'));
  console.log('✓ README.md 已复制');
}

// 安装依赖（tsup clean 会清空 node_modules）
console.log('⏳ 安装依赖...');
execSync('npm install --production', { cwd: distPkg, stdio: 'inherit' });
console.log('✓ 依赖已安装');

console.log('\n构建完成！可以通过以下方式测试：');
console.log('  cd dist-pkg && npm link');
console.log('  sydev --version');
