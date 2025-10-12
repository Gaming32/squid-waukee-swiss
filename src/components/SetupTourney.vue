<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import type { AppContext, MapPool } from 'maps.iplabs.ink/src/types-interfaces/Interfaces'
import {
  decodeAppContext as decodeMapsAppContext,
  decodeLegacyMapPool,
} from 'maps.iplabs.ink/src/helpers/AppContext'
import { modeAbbreviationToWords } from 'maps.iplabs.ink/src/helpers/MapMode'
import type { TournamentFormat } from '@/tournament'

const props = defineProps<{
  initialFormat: TournamentFormat
  initialMapPool: MapPool
  initialTeams: string[]
}>()

const emit = defineEmits<{
  (e: 'finish', format: TournamentFormat, mapPool: MapPool, teams: string[]): void
}>()

function pluralFormat(n: number, what: string) {
  return `${n} ${n === 1 ? what : what + 's'}`
}

const tournamentFormat = ref<TournamentFormat>(props.initialFormat)
// The function has an exhaustive switch statement, so it does return in every case. This lint is bugged.
// eslint-disable-next-line vue/return-in-computed-property
const formattedTournamentFormat = computed(() => {
  switch (tournamentFormat.value.type) {
    case 'swiss':
      return `Swiss Bo${tournamentFormat.value.swissBestOf} → Bo${tournamentFormat.value.playoffsBestOf}`
  }
})

const mapPool = ref<MapPool>(props.initialMapPool)
const totalMapModes = computed(() => Object.values(mapPool.value).flatMap((x) => x).length)
function importMapPoolFromUrl() {
  const mapPoolUrlText = prompt(
    'Enter a URL with a map pool from sendou.ink/maps or maps.iplabs.ink.\n' +
      'You can get a URL like this by copying the URL bar while on either of these pages.',
  )
  if (!mapPoolUrlText) return
  const mapPoolUrl = URL.parse(mapPoolUrlText)
  if (!mapPoolUrl) return

  if (mapPoolUrl.searchParams.has('c')) {
    mapPool.value = decodeMapsAppContext(mapPoolUrl.searchParams.get('c')!).mapPool
  } else if (mapPoolUrl.searchParams.has('pool')) {
    mapPool.value = decodeLegacyMapPool(mapPoolUrl.searchParams.get('pool')!, {
      tw: [],
      sz: [],
      tc: [],
      rm: [],
      cb: [],
    })
  } else {
    alert('Unknown map pool URL')
  }
}
function importMapPoolFromJson() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const jsonData = reader.result
      if (!jsonData) return
      const newPool = (JSON.parse(jsonData as string) as AppContext).mapPool
      if (!newPool) return
      mapPool.value = newPool
    }
    reader.readAsText(file)
  }
  input.click()
}

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
    <details class="narrow-element">
      <summary>
        <h3>Tournament format ({{ formattedTournamentFormat }})</h3>
      </summary>
      <p>
        <select class="narrow-element padded-select">
          <option>Swiss</option>
        </select>
      </p>
      <template v-if="tournamentFormat.type === 'swiss'">
        <p>
          Swiss Best Of:
          <input type="number" v-model="tournamentFormat.swissBestOf" min="1" step="2" />
        </p>
        <p>
          Advancement Cutoff:
          <input type="number" v-model="tournamentFormat.advancementCutoff" min="2" />
        </p>
        <p>
          Playoffs Best Of:
          <input type="number" v-model="tournamentFormat.playoffsBestOf" min="1" step="2" />
        </p>
      </template>
    </details>

    <details class="narrow-element" open>
      <summary>
        <h3>Map pool ({{ pluralFormat(totalMapModes, 'map/mode') }})</h3>
      </summary>
      <ul>
        <li
          v-for="(maps, mode) in mapPool"
          :key="mode"
          :class="maps.length ? 'tooltip-text' : ''"
          :title="maps.join(', ')"
        >
          {{ modeAbbreviationToWords(mode) }}: {{ pluralFormat(maps.length, 'map') }}
        </li>
      </ul>
      <button class="wa-brand block-button" @click="importMapPoolFromUrl">
        Import from map pool URL
      </button>
      <button class="wa-brand block-button" @click="importMapPoolFromJson">
        Import from maps.iplabs.com JSON
      </button>
    </details>

    <details class="narrow-element" open>
      <summary>
        <h3>Teams ({{ pluralFormat(teams.length, 'team') }})</h3>
      </summary>
      <div>Enter team name:</div>
      <p>
        <input
          class="small-input"
          ref="teamNameInput"
          v-model="newTeamName"
          placeholder="Team name"
          @keyup.enter="addNewTeam"
        />&MediumSpace;
        <button class="wa-brand" :disabled="!newTeamName.length" @click="addNewTeam">
          Add team
        </button>
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
      <p v-else>No teams added yet!</p>
    </details>

    <p>
      <button
        class="wa-success"
        :disabled="teams.length < 2 || !totalMapModes"
        @click="() => emit('finish', tournamentFormat, mapPool, teams)"
      >
        Let's go!
      </button>
    </p>
  </div>
</template>

<style scoped>
.narrow-element {
  width: fit-content;
  min-width: 30%;
}

input[type='number'] {
  max-width: calc(20px + 4em);
}

.padded-select {
  padding-right: 38px;
}

.tooltip-text {
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 0.2em;
}

.block-button {
  display: block;
  margin-block: 10px;
}

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
