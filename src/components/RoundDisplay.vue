<script setup lang="ts">
defineProps<{
  team1: string
  team2: string
  score1: number
  score2: number
}>()
</script>

<template>
  <div>{{ team1 }}: {{ score1 }}<br />{{ team2 }}: {{ score2 }}</div>
</template>
