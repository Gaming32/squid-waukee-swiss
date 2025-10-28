import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { qrcode } from 'vite-plugin-qrcode'
import describe from 'git-describe'
import { spawnSync } from 'node:child_process'

const extraEnv: { [key: string]: string } = {}

if (process.env.VERCEL_GIT_PROVIDER === 'github') {
  extraEnv.GIT_REMOTE = `https://github.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
} else {
  try {
    extraEnv.GIT_REMOTE = spawnSync('git', ['remote', 'get-url', 'origin'])
      .stdout.toString()
      .trim()
      .replace(/\.git$/, '')
  } catch {}
}

if ('VERCEL_GIT_COMMIT_REF' in process.env) {
  extraEnv.GIT_REV = process.env.VERCEL_GIT_COMMIT_REF!
} else {
  try {
    extraEnv.GIT_REV = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
      .stdout.toString()
      .trim()
      .replace(/\.git$/, '')
  } catch {}
}

if ('VERCEL_GIT_PULL_REQUEST_ID' in process.env) {
  extraEnv.GIT_PR = process.env.VERCEL_GIT_PULL_REQUEST_ID!
}

try {
  const gitInfo = describe.gitDescribeSync()
  if (gitInfo.dirty) {
    extraEnv.GIT_DIRTY = '1'
  }
  extraEnv.GIT_COMMIT = gitInfo.hash
} catch {}

extraEnv.APP_URL =
  process.env.VERCEL_ENV === 'production'
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL!
    : 'VERCEL_URL' in process.env
      ? process.env.VERCEL_URL!
      : 'squid-waukee-tourney.jemnetworks.com'

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
    Object.entries(extraEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  ),
})
