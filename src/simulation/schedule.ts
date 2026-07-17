import type { Component, Day, Usage } from '../models/types'

const days: Day[] = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const minutes = (time: string) => { const [hours, mins] = time.split(':').map(Number); return hours * 60 + mins }

export function usageFactor(usage: Usage, hour: number): number {
  const minuteOfDay = (hour * 60) % 1440
  if (usage.mode === 'always') return 1
  if (usage.mode === 'duty_cycle') return usage.dutyCyclePercent / 100
  if (usage.mode === 'duration') return minuteOfDay < usage.hoursPerDay * 60 ? 1 : 0
  if (usage.mode === 'profile') return 1
  if (usage.mode === 'production') return usage.capacityFactorPercent / 100
  const day = days[Math.floor(hour / 24) % 7]
  if (!usage.daysOfWeek.includes(day)) return 0
  const start = minutes(usage.start), end = minutes(usage.end)
  return start <= end ? Number(minuteOfDay >= start && minuteOfDay < end) : Number(minuteOfDay >= start || minuteOfDay < end)
}

export function componentPower(component: Component, usage: Usage, hour: number): number {
  if (usage.mode === 'profile') {
    const index = Math.floor((hour * 60) / usage.resolutionMinutes) % usage.valuesW.length
    return usage.valuesW[index] ?? 0
  }
  const rated = component.roles.includes('generator') ? component.electrical.ratedPowerW : component.electrical.continuousPowerW
  if (rated == null) return 0
  if (component.roles.includes('generator') && component.generatorType === 'pv' && usage.mode !== 'production') {
    const solarHour = hour % 24
    return rated * Math.max(0, Math.sin(((solarHour - 6) / 12) * Math.PI))
  }
  return rated * usageFactor(usage, hour)
}
