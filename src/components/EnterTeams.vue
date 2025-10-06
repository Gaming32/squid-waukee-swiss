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
    <h2>Enter teams:</h2>
    <p>
      Enter team name:&MediumSpace;
      <input
        ref="teamNameInput"
        v-model="newTeamName"
        placeholder="Team name"
        @keyup.enter="addNewTeam"
      />&MediumSpace;
      <button :disabled="!newTeamName.length" @click="addNewTeam">Add team</button>
    </p>
    <table>
      <thead>
        <tr>
          <th><button class="icon-button" @click="deleteAllTeams">❌</button></th>
          <th>Team</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(team, teamNumber) in teams" :key="team">
          <td>
            <button class="icon-button" @click="() => deleteTeam(teamNumber)">❌</button>
          </td>
          <td>{{ team }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      <button :disabled="teams.length < 2" @click="() => emit('finish', teams)">
        Teams all set! ({{ teams.length }} team{{ teams.length !== 1 ? 's' : '' }})
      </button>
    </p>
  </div>
</template>

<style></style>
