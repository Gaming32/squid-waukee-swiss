<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

const props = defineProps<{
  initialTeams: string[]
}>()

const emit = defineEmits<{
  (e: 'finish', teams: string[]): void
}>()

const teams = ref<string[]>(props.initialTeams)
const teamNameInput = useTemplateRef('teamNameInput')

const newTeamName = ref('')
function addNewTeam() {
  if (newTeamName.value.length > 0) {
    teams.value.push(newTeamName.value)
    newTeamName.value = ''
    teamNameInput.value?.focus()
  }
}

function deleteAllTeams() {
  teams.value = []
}

function deleteTeam(index: number) {
  teams.value.splice(index, 1)
}
</script>

<template>
  <div>
    <h2>Enter teams</h2>
    <div>Enter team name:</div>
    <p>
      <input
        class="small-input"
        ref="teamNameInput"
        v-model="newTeamName"
        placeholder="Team name"
        @keyup.enter="addNewTeam"
      />&MediumSpace;
      <button class="wa-brand" :disabled="!newTeamName.length" @click="addNewTeam">Add team</button>
    </p>
    <table v-if="teams.length" class="inline-table wa-hover-rows wa-zebra-rows">
      <thead>
        <tr>
          <th class="centered-horizontally">
            <a class="icon-button" @click="deleteAllTeams">❌</a>
          </th>
          <th class="centered-horizontally">Team</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(team, teamNumber) in teams" :key="team">
          <td>
            <a class="icon-button" @click="() => deleteTeam(teamNumber)">❌</a>
          </td>
          <td>{{ team }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No teams added yet</p>
    <p>
      <button class="wa-success" :disabled="teams.length < 2" @click="() => emit('finish', teams)">
        Teams all set! {{ teams.length >= 2 ? `(${teams.length} teams)` : '' }}
      </button>
    </p>
  </div>
</template>

<style scoped>
.small-input {
  max-width: 225px;
}

.inline-table {
  display: inline-block;
}

.centered-horizontally {
  text-align: center;
}
</style>
