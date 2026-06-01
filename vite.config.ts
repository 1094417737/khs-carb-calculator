/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import JSObfuscator from 'javascript-obfuscator'
const { obfuscate } = JSObfuscator
import type { OutputChunk } from 'rollup'

const ENGINE_OBFUSCATION_OPTIONS = {
  // 域名死锁
  domainLock: ['khs-fuel-planner.pages.dev'],

  // 变量/函数名十六进制化
  identifierNamesGenerator: 'hexadecimal' as const,

  // 字符串阵列 + Base64 编码 + 打乱
  stringArray: true,
  stringArrayEncoding: ['base64'] as const,
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
}

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
            // 地图瓦片：离线优先，长期缓存
            urlPattern: /^https:\/\/.*\.basemaps\.cartocdn\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 30 * 86400 },
            },
          },
          {
            // 通用外部资源
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

    // ===== 核心引擎混淆插件（仅在 generateBundle 阶段，压缩后执行）=====
    {
      name: 'vite-plugin-engine-obfuscation',
      apply: 'build',
      generateBundle(_, bundle) {
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type !== 'chunk') continue
          const outputChunk = chunk as OutputChunk
          // 仅处理包含 engine 源码的 chunk
          const hasEngineCode = outputChunk.moduleIds?.some(
            (id: string) => id.includes('/engine/') && !id.includes('__tests__')
          )
          if (!hasEngineCode) continue

          console.log(`[engine-obfuscation] Obfuscating chunk: ${fileName}`)
          const result = obfuscate(outputChunk.code, ENGINE_OBFUSCATION_OPTIONS)
          outputChunk.code = result.getObfuscatedCode()
        }
      },
    } as import('vite').Plugin,
  ],

  build: {
    rollupOptions: {
      output: {
        // 将 engine 目录代码拆分为独立 chunk，精准混淆
        manualChunks(id) {
          if (id.includes('/engine/') && !id.includes('__tests__')) {
            return 'engine'
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    open: true,
  },

  test: {
    globals: true,
    environment: 'jsdom',
  },
}))
