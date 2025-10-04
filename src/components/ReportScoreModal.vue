<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

const team1 = ref('')
const score1 = ref(0)
const team2 = ref('')
const score2 = ref(0)

type Callback = (scores?: { score1: number; score2: number }) => void

const dialogRoot = useTemplateRef('dialogRoot')

let callback: Callback = () => {}

function submit() {
  dialogRoot.value?.close()
  callback({ score1: score1.value, score2: score2.value })
}

function cancel() {
  dialogRoot.value?.close()
  callback()
}

function open(
  teams: { team1: string; score1: number; team2: string; score2: number },
  closeCallback: Callback,
) {
  team1.value = teams.team1
  score1.value = teams.score1
  team2.value = teams.team2
  score2.value = teams.score2
  callback = closeCallback
  dialogRoot.value?.showModal()
}
defineExpose({ open })
</script>

<template>
  <dialog @keyup.esc="cancel" ref="dialogRoot">
    <p>Enter the score of the matches:</p>
    <p>{{ team1 }}: <input v-model.number="score1" @keyup.enter="submit" /></p>
    <p>{{ team2 }}: <input v-model.number="score2" @keyup.enter="submit" /></p>
    <p>
      <button @click="cancel">Cancel</button>
      <button @click="submit">Confirm</button>
    </p>
  </dialog>
</template>

<style>
::backdrop {
  background-color: #fff8;
}
</style>
