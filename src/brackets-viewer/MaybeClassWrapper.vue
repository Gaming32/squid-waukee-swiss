<script setup lang="ts">
defineProps<{
  classes: { [className: string]: boolean | undefined }
}>()
</script>

<template>
  <div v-if="Object.values(classes).some((x) => x)" :class="classes">
    <slot />
  </div>
  <slot v-else />
</template>
