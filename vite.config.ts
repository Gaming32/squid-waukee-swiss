import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { qrcode } from 'vite-plugin-qrcode'
import describe from 'git-describe'
import { spawnSync } from 'node:child_process'

const extraDefine: { [key: string]: string } = {}

console.log(process.env)

try {
  extraDefine.GIT_REMOTE = spawnSync('git', ['remote', 'get-url', 'origin'])
    .stdout.toString()
    .trim()
    .replace(/\.git$/, '')
} catch {}

if (process.env.VERCEL_GIT_PULL_REQUEST_ID) {
  extraDefine.GIT_PR = process.env.VERCEL_GIT_PULL_REQUEST_ID
}

try {
  const gitInfo = describe.gitDescribeSync()
  if (gitInfo.dirty) {
    extraDefine.GIT_DIRTY = '1'
  }
  extraDefine.GIT_COMMIT = gitInfo.hash
} catch {}

// https://vite.dev/config/
export default defineConfig({
  base: '',
  plugins: [vue(), vueDevTools(), qrcode()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: Object.fromEntries(
    Object.entries(extraDefine).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  ),
})
