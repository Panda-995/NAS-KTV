#!/usr/bin/env node
// 将各包的版本号统一为传入的产品版本（发布时 = git tag）。
// 调用：node scripts/set-version.mjs 1.2.3
// 版本来源优先级：argv[2] > 环境变量 GITHUB_REF_NAME(去 v) > .release-please-manifest.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function resolveVersion() {
  const arg = process.argv[2];
  if (arg) return arg.replace(/^v/, '');
  const ref = process.env.GITHUB_REF_NAME || process.env.TAG || '';
  if (ref.startsWith('v')) return ref.slice(1);
  try {
    const manifest = JSON.parse(
      readFileSync(resolve(root, '.release-please-manifest.json'), 'utf-8')
    );
    if (manifest && manifest['.']) return manifest['.'];
  } catch {
    /* ignore */
  }
  return '0.0.0';
}

const version = resolveVersion();
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`[set-version] invalid version: "${version}"`);
  process.exit(1);
}

const targets = [
  'packages/backend/package.json',
  'packages/admin-web/package.json',
  'packages/mobile-h5/package.json',
  'packages/tv-app/package.json',
  'packages/tv-app/src-tauri/tauri.conf.json',
];

for (const rel of targets) {
  const p = resolve(root, rel);
  const json = JSON.parse(readFileSync(p, 'utf-8'));
  json.version = version;
  writeFileSync(p, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  console.log(`[set-version] ${rel} -> ${version}`);
}

console.log(`[set-version] done (${version})`);
