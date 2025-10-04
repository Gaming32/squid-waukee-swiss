<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'finish', teams: string[]): void
}>()

const teams = ref<string[]>([])

const newTeamName = ref('')
function addNewTeam() {
  if (newTeamName.value.length > 0) {
    teams.value.push(newTeamName.value)
    newTeamName.value = ''
  }
}

function deleteTeam(index: number) {
  teams.value.splice(index, 1)
}

function shiftTeam(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex >= 0 && newIndex <= teams.value.length) {
    teams.value.splice(newIndex, 0, ...teams.value.splice(index, 1))
  }
}
</script>

<template>
  <div>
    <h2>Enter teams:</h2>
    <p>
      Enter team name:
      <input v-model="newTeamName" placeholder="Team name" @keyup.enter="addNewTeam" />&MediumSpace;
      <button :disabled="!newTeamName.length" @click="addNewTeam">Add team</button>
    </p>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th>Controls</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(team, teamNumber) in teams" :key="team">
          <td>{{ teamNumber + 1 }}</td>
          <td>{{ team }}</td>
          <td>
            <button class="icon-button" @click="() => deleteTeam(teamNumber)">❌</button>
            <button class="icon-button unicode-arrow" @click="() => shiftTeam(teamNumber, -1)">⬆</button>
            <button class="icon-button unicode-arrow" @click="() => shiftTeam(teamNumber, 1)">⬇</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p>
      <button :disabled="teams.length < 2" @click="() => emit('finish', teams)">
        Teams all set!
      </button>
    </p>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap');

.unicode-arrow {
  font-family: 'Noto Sans Symbols 2';
  font-size: 110%;
  height: 1em;
}
</style>
