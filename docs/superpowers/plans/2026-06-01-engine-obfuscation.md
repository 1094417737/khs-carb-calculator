# Engine Code Obfuscation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect `src/engine/**/*.ts` core tactical algorithms from theft via vite-plugin-javascript-obfuscator, with zero performance impact and zero effect on dev mode.

**Architecture:** Add `vite-plugin-javascript-obfuscator` as a build-only Vite plugin, conditionally enabled only in production mode. The plugin targets only `src/engine/**/*.ts` (excluding tests) with lightweight hexadecimal identifier renaming, Base64 string array encoding, and domain locking — explicitly disabling all heavy transforms (control flow flattening, dead code, number expressions).

**Tech Stack:** Vite 5, vite-plugin-javascript-obfuscator, javascript-obfuscator

---

### Task 1: Install the obfuscator plugin

**Files:**
- Modify: `package.json` (dependency added by npm)

- [ ] **Step 1: Install vite-plugin-javascript-obfuscator**

```bash
npm install -D vite-plugin-javascript-obfuscator
```

Expected: Package added to `devDependencies` in `package.json`, installed in `node_modules`.

- [ ] **Step 2: Verify installation**

```bash
node -e "require('vite-plugin-javascript-obfuscator'); console.log('OK')"
```

Expected: Prints `OK` without errors.

---

### Task 2: Add obfuscation to vite.config.ts

**Files:**
- Modify: `vite.config.ts` (full file rewrite)

- [ ] **Step 1: Update vite.config.ts with obfuscator plugin**

Replace `vite.config.ts` with the following content:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import obfuscator from 'vite-plugin-javascript-obfuscator'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'KHS耐力补碳计算器',
        short_name: 'KHS补碳',
        description: '基于运动科学的个性化耐力运动补给方案',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 30 * 86400 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),

    // ===== 核心引擎混淆（仅生产构建生效）=====
    ...(mode === 'production' ? [
      obfuscator({
        // 精准打击：仅混淆 src/engine/ 下的 .ts 文件
        include: ['src/engine/**/*.ts'],
        // 排除测试文件
        exclude: [
          'src/engine/__tests__/**',
          'node_modules/**',
        ],
        // 仅在 vite build 时生效
        apply: 'build',

        options: {
          // 域名死锁
          domainLock: ['khs-fuel-planner.pages.dev'],

          // 变量/函数名十六进制化
          identifierNamesGenerator: 'hexadecimal',

          // 字符串阵列 + Base64 编码 + 打乱
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayShuffle: true,

          // 对象键名混淆
          transformObjectKeys: true,

          // 基础防御
          selfDefending: true,
          disableConsoleOutput: true,

          // 🚫 性能杀手 — 全部关闭
          controlFlowFlattening: false,
          numbersToExpressions: false,
          deadCodeInjection: false,

          // 辅助配置
          compact: true,
          simplify: true,
          splitStrings: true,
          stringArrayThreshold: 0.75,
        },
      }),
    ] : []),
  ],

  server: {
    port: 5173,
    open: true,
  },

  test: {
    globals: true,
    environment: 'jsdom',
  },
}))
```

### Task 3: Verify dev mode is unaffected

- [ ] **Step 1: Start dev server briefly to check for config errors**

```bash
npx vite --host 2>&1 | head -5 &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1 2>/dev/null
```

Expected: Dev server starts without errors. No obfuscation warnings in console output.

- [ ] **Step 2: Confirm no obfuscation plugin messages in dev mode**

Expected: The dev server output should NOT contain any "obfuscator" or "javascript-obfuscator" related messages. The plugin is completely absent from dev mode.

### Task 4: Verify production build succeeds with obfuscation

- [ ] **Step 1: Run the full production build**

```bash
npm run build
```

Expected: Build completes with exit code 0. Obfuscator warnings (if any) are acceptable, but build must succeed.

- [ ] **Step 2: Inspect build output for obfuscation evidence**

```bash
# Check that engine code in build output contains obfuscated patterns
# Look for hexadecimal identifiers and string array references
ls -la dist/assets/*.js
head -c 2000 dist/assets/*.js | cat -v
```

Expected: Build JS should contain obfuscated engine code — look for `_0x` prefixed hex identifiers and Base64-encoded string arrays.

### Task 5: Commit

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "feat: add engine code obfuscation (build-only, lightweight)"
```
