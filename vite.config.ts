import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { qrcode } from 'vite-plugin-qrcode'
import describe from 'git-describe'
import { spawnSync } from 'node:child_process'

const extraDefine: { [key: string]: string } = {}

if (process.env.VERCEL_GIT_PROVIDER === 'github') {
  extraDefine.GIT_REMOTE = `https://github.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
} else {
  try {
    extraDefine.GIT_REMOTE = spawnSync('git', ['remote', 'get-url', 'origin'])
      .stdout.toString()
      .trim()
      .replace(/\.git$/, '')
  } catch {}
}

if ('VERCEL_GIT_PULL_REQUEST_ID' in process.env) {
  extraDefine.GIT_PR = process.env.VERCEL_GIT_PULL_REQUEST_ID!
}

try {
  const gitInfo = describe.gitDescribeSync()
  if (gitInfo.dirty) {
    extraDefine.GIT_DIRTY = '1'
  }
  extraDefine.GIT_COMMIT = gitInfo.hash
} catch {}

console.log(extraDefine)

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
