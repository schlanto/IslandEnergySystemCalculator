import type { Component, SimulationResult, SystemConfiguration } from '../models/types'
import { batteryRuntimeHours, checkCompatibility, interpolateEfficiency } from '../calculation/core'
import { componentPower } from './schedule'

export function simulate(configuration: SystemConfiguration, catalog: Component[]): SimulationResult {
  const items = configuration.components.flatMap((selected) => { const component = catalog.find((candidate) => candidate.id === selected.componentId); return component ? [{ component, selected }] : [] })
  const consumers = items.filter((item) => item.component.roles.includes('consumer'))
  const generators = items.filter((item) => item.component.roles.includes('generator'))
  const batteries = items.filter((item) => item.component.roles.includes('storage'))
  const inverter = items.find((item) => item.component.converterType === 'dc_ac_inverter')?.component
  const mppt = items.find((item) => item.component.converterType === 'mppt_charge_controller')?.component
  const usableWh = batteries.reduce((sum, item) => sum + (item.component.electrical.usableCapacityWh ?? 0) * item.selected.quantity, 0)
  const chargeLimitW = batteries.reduce((sum, item) => sum + (item.component.electrical.maximumChargePowerW ?? ((item.component.electrical.maximumChargeCurrentA ?? 0) * (item.component.electrical.nominalVoltageV ?? 0))) * item.selected.quantity, 0)
  const dischargeLimitW = batteries.reduce((sum, item) => sum + (item.component.electrical.maximumContinuousDischargePowerW ?? ((item.component.electrical.maximumContinuousDischargeCurrentA ?? 0) * (item.component.electrical.nominalVoltageV ?? 0))) * item.selected.quantity, 0)
  const stepHours = configuration.simulation.resolutionMinutes / 60
  let storedWh = usableWh * configuration.simulation.initialSocPercent / 100
  const minWh = usableWh * configuration.simulation.minimumSocPercent / 100
  const maxWh = usableWh * configuration.simulation.maximumSocPercent / 100
  const chargeEfficiency = batteries[0]?.component.operation.chargeEfficiency ?? 1
  const dischargeEfficiency = batteries[0]?.component.operation.dischargeEfficiency ?? 1
  const assumptions: string[] = []
  if (!batteries.length) assumptions.push('No storage selected; all instantaneous deficits become unmet load.')
  if (batteries.length && batteries.some((item) => item.component.operation.chargeEfficiency == null || item.component.operation.dischargeEfficiency == null)) assumptions.push('Missing battery efficiency was treated as 100%; result is uncertain.')
  const consumerEnergy = new Map<string, number>()
  const points: SimulationResult['points'] = []
  const inverterLimit = inverter?.electrical.output?.continuousPowerW ?? Infinity
  const inverterPeak = inverter?.electrical.output?.peakPowerW ?? Infinity
  let totalDemand = 0, totalGeneration = 0, totalUnmet = 0, totalUnused = 0, totalLosses = 0, maxLoad = 0, overloadEvents = 0

  for (let index = 0; index < configuration.simulation.durationHours / stepHours; index++) {
    const hour = index * stepHours
    const rawGenerationW = generators.reduce((sum, item) => sum + componentPower(item.component, item.selected.usage, hour) * item.selected.quantity, 0)
    const mpptEfficiency = mppt?.electrical.efficiency?.nominal ?? 1
    const generationW = rawGenerationW * mpptEfficiency
    let demandW = 0
    for (const item of consumers) { const power = componentPower(item.component, item.selected.usage, hour) * item.selected.quantity; demandW += power; consumerEnergy.set(item.component.name, (consumerEnergy.get(item.component.name) ?? 0) + power * stepHours) }
    const loadPercent = inverterLimit === Infinity ? 0 : (demandW / inverterLimit) * 100
    const inverterEfficiency = interpolateEfficiency(inverter?.electrical.efficiency?.curve ?? [], loadPercent) ?? inverter?.electrical.efficiency?.nominal ?? configuration.assumptions?.defaultConverterEfficiency ?? 1
    if (inverter && inverterEfficiency === 1 && inverter.electrical.efficiency?.nominal == null) assumptions.push('Missing inverter efficiency was treated as 100%; result is uncertain.')
    const dcDemandW = demandW / inverterEfficiency + (inverter?.electrical.standbyPowerW ?? 0)
    const balanceW = generationW - dcDemandW
    let batteryChargeW = 0, batteryDischargeW = 0, unusedW = 0, unmetW = 0
    if (balanceW >= 0) { const roomInputW = stepHours ? (maxWh - storedWh) / (stepHours * chargeEfficiency) : 0; batteryChargeW = Math.max(0, Math.min(balanceW, chargeLimitW || 0, roomInputW)); storedWh += batteryChargeW * stepHours * chargeEfficiency; unusedW = balanceW - batteryChargeW }
    else { const availableOutputW = stepHours ? (storedWh - minWh) * dischargeEfficiency / stepHours : 0; batteryDischargeW = Math.max(0, Math.min(-balanceW, dischargeLimitW || 0, availableOutputW)); storedWh -= batteryDischargeW * stepHours / dischargeEfficiency; unmetW = -balanceW - batteryDischargeW }
    const lossesW = rawGenerationW - generationW + Math.max(0, dcDemandW - demandW)
    const overload = demandW > inverterLimit || demandW > inverterPeak || (balanceW < 0 && -balanceW > dischargeLimitW && batteries.length > 0)
    if (overload) overloadEvents++
    maxLoad = Math.max(maxLoad, demandW); totalDemand += demandW * stepHours; totalGeneration += rawGenerationW * stepHours; totalUnmet += unmetW * stepHours; totalUnused += unusedW * stepHours; totalLosses += lossesW * stepHours
    points.push({ hour, generationW: rawGenerationW, demandW, batteryChargeW, batteryDischargeW, socPercent: usableWh ? storedWh / usableWh * 100 : 0, unusedW, unmetW, lossesW, overload })
  }
  const soc = points.map((point) => point.socPercent)
  return { points, compatibility: checkCompatibility(items), totals: { generationWh: totalGeneration, demandWh: totalDemand, unmetWh: totalUnmet, unusedWh: totalUnused, lossesWh: totalLosses, minSocPercent: soc.length ? Math.min(...soc) : configuration.simulation.initialSocPercent, maxSocPercent: soc.length ? Math.max(...soc) : configuration.simulation.initialSocPercent, maxLoadW: maxLoad, overloadEvents, runtimeHours: batteryRuntimeHours(usableWh * (configuration.simulation.initialSocPercent - configuration.simulation.minimumSocPercent) / 100, totalDemand / configuration.simulation.durationHours, dischargeEfficiency) }, consumerEnergy: [...consumerEnergy].map(([name, energyWh]) => ({ name, energyWh })).sort((a,b) => b.energyWh-a.energyWh), assumptions: [...new Set(assumptions)] }
}
