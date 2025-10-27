<script setup lang="ts">
const gitRemote: string = import.meta.env.GIT_REMOTE
const gitDirty = Boolean(import.meta.env.GIT_DIRTY)
const gitCommit: string = import.meta.env.GIT_COMMIT
const gitPr: string = import.meta.env.GIT_PR
</script>

<template>
  <p class="footer">
    ©2025 Gaming32. Commit
    <a v-if="gitRemote" :href="`${gitRemote}/commit/${gitCommit}`">{{ gitCommit }}</a>
    <template v-else>{{ gitCommit }}</template
    >.
    <template v-if="gitPr"
      >(Pull request <a :href="`${gitRemote}/pull/${gitPr}`">#{{ gitPr }}</a
      >)</template
    >
    <template v-if="gitDirty">(DIRTY)</template>
  </p>
</template>

<style scoped>
.footer {
  text-align: center;
}
</style>
