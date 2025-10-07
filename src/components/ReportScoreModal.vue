<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'

const team1 = ref('')
const score1 = ref(0)
const team2 = ref('')
const score2 = ref(0)

const bestOf = ref(0)
const maxScore = computed(() => (bestOf.value + 1) / 2)
const canSubmit = computed(
  () =>
    (score1.value === maxScore.value || score2.value === maxScore.value) &&
    score1.value + score2.value <= bestOf.value,
)

const dialogRoot = useTemplateRef('dialogRoot')

type Callback = (scores?: { score1: number; score2: number }) => void
let callback: Callback = () => {}

function submit() {
  if (!canSubmit.value) return
  dialogRoot.value?.close()
  callback({ score1: score1.value, score2: score2.value })
}

function cancel() {
  dialogRoot.value?.close()
  callback()
}

function open(
  teams: { team1: string; score1: number; team2: string; score2: number },
  bestOfN: number,
  closeCallback: Callback,
) {
  team1.value = teams.team1
  score1.value = teams.score1
  team2.value = teams.team2
  score2.value = teams.score2
  bestOf.value = bestOfN

  callback = closeCallback
  dialogRoot.value?.showModal()
}
defineExpose({ open })
</script>

<template>
  <dialog @keyup.esc="cancel" ref="dialogRoot">
    <div class="upper-right">
      <a class="icon-button" @click="cancel">[X]</a>
    </div>

    <p>Enter the score of the matches:</p>
    <p>
      {{ team1 }}:
      <input
        class="wa-size-s"
        v-model.number="score1"
        type="number"
        min="0"
        :max="maxScore"
        @keyup.enter="submit"
      />
    </p>
    <p>
      {{ team2 }}:
      <input
        class="wa-size-s"
        v-model.number="score2"
        type="number"
        min="0"
        :max="maxScore"
        @keyup.enter="submit"
      />
    </p>
    <p>
      <button class="wa-brand" :disabled="!canSubmit" @click="submit">Submit</button>
    </p>
  </dialog>
</template>

<style scoped>
.upper-right {
  position: absolute;
  top: 10px;
  right: 10px;
}

input[type='number'] {
  max-width: calc(15px + 4em);
}
</style>
