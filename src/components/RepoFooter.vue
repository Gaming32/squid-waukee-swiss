<script setup lang="ts">
import { h, type FunctionalComponent } from 'vue'

const gitRemote: string = import.meta.env.GIT_REMOTE
const gitRev: string = import.meta.env.GIT_REV
const gitDirty = !!import.meta.env.GIT_DIRTY
const gitCommit: string = import.meta.env.GIT_COMMIT
const gitPr: string = import.meta.env.GIT_PR

const MaybeLink: FunctionalComponent<{ urlPart: string; urlLink: string }> = (props, { slots }) => {
  const innerBody = slots.default?.() ?? props.urlLink
  return gitRemote
    ? h('a', { href: `${gitRemote}/${props.urlPart}/${props.urlLink}`, target: '_blank' }, [
        innerBody,
      ])
    : innerBody
}
MaybeLink.props = {
  urlPart: {
    type: String,
    required: true,
  },
  urlLink: {
    type: String,
    required: true,
  },
}
</script>

<template>
  <p class="footer">
    ©2025 Gaming32. Commit <maybe-link url-part="commit" :url-link="gitCommit" /><template
      v-if="gitRev !== 'main'"
    >
      on branch <maybe-link url-part="tree" :url-link="gitRev" /></template
    >.
    <template v-if="gitDirty">(DIRTY)</template>
    <template v-else-if="gitPr"
      >(Pull request <maybe-link url-part="pull" :url-link="gitPr">#{{ gitPr }}</maybe-link
      >)</template
    >
  </p>
</template>

<style scoped>
.footer {
  text-align: center;
}

@media print {
  .footer {
    display: none;
  }
}
</style>
