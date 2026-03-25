import { ref, onUnmounted, type Ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'

export function usePolling(
  callback: () => Promise<void>,
  interval: number,
  options: { immediate?: boolean } = { immediate: true }
) {
  const failCount = ref(0)
  const paused = ref(false)
  const maxFails = 3

  async function execute() {
    if (paused.value) return
    try {
      await callback()
      failCount.value = 0
    } catch {
      failCount.value++
      if (failCount.value >= maxFails) {
        paused.value = true
      }
    }
  }

  const { pause, resume: resumeInterval } = useIntervalFn(execute, interval, {
    immediate: false,
  })

  function start() {
    paused.value = false
    failCount.value = 0
    if (options.immediate) execute()
    resumeInterval()
  }

  function stop() {
    pause()
  }

  function reconnect() {
    paused.value = false
    failCount.value = 0
    execute()
  }

  function refresh() {
    execute()
  }

  start()
  onUnmounted(stop)

  return {
    paused: paused as Ref<boolean>,
    failCount: failCount as Ref<number>,
    stop,
    reconnect,
    refresh,
  }
}
