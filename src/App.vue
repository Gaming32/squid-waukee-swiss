<script setup lang="ts">
import { ref } from 'vue'
import EnterTeams from './components/EnterTeams.vue'

enum AppState {
  WAITING_FOR_TEAMS,
}

const state = ref(AppState.WAITING_FOR_TEAMS)
</script>

<template>
  <div>
    <h1>Squid-Waukee</h1>
    <EnterTeams
      v-show="state == AppState.WAITING_FOR_TEAMS"
      @finish="(teams) => console.log(teams)"
    />
  </div>
</template>

<style scoped></style>
