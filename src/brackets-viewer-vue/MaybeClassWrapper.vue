<script setup lang="ts">
import { defineProps } from 'vue'

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
