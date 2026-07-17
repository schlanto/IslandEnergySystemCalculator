import type { Component, CompatibilityResult, SelectedComponent } from '../models/types'

export function interpolateEfficiency(curve: { loadPercent: number; efficiency: number }[], loadPercent: number): number | null {
  if (!curve.length) return null
  const sorted = [...curve].sort((a, b) => a.loadPercent - b.loadPercent)
  if (loadPercent <= sorted[0].loadPercent) return sorted[0].efficiency
  if (loadPercent >= sorted.at(-1)!.loadPercent) return sorted.at(-1)!.efficiency
  const upperIndex = sorted.findIndex((point) => point.loadPercent >= loadPercent)
  const lower = sorted[upperIndex - 1]
  const upper = sorted[upperIndex]
  const ratio = (loadPercent - lower.loadPercent) / (upper.loadPercent - lower.loadPercent)
  return lower.efficiency + ratio * (upper.efficiency - lower.efficiency)
}

export function batteryCurrent(powerW: number, voltageV: number, efficiency = 1): number | null {
  return voltageV > 0 && efficiency > 0 ? powerW / voltageV / efficiency : null
}

export function batteryRuntimeHours(usableCapacityWh: number, loadW: number, efficiency = 1): number | null {
  return loadW > 0 && usableCapacityWh >= 0 && efficiency > 0 ? (usableCapacityWh * efficiency) / loadW : null
}

export function continuousLoad(items: { component: Component; selected: SelectedComponent }[]): number {
  return items.reduce((sum, item) => sum + (item.component.electrical.continuousPowerW ?? 0) * item.selected.quantity, 0)
}

export function startupLoad(items: { component: Component; selected: SelectedComponent }[]): number {
  const base = continuousLoad(items)
  return items.reduce((maximum, item) => {
    const continuous = item.component.electrical.continuousPowerW
    const startup = item.component.electrical.startupPowerW
    if (continuous == null || startup == null) return maximum
    return Math.max(maximum, base - continuous * item.selected.quantity + startup + continuous * Math.max(0, item.selected.quantity - 1))
  }, base)
}

const result = (status: CompatibilityResult['status'], code: string, message: string, componentIds: string[]): CompatibilityResult => ({ status, code, message, componentIds })

export function checkCompatibility(items: { component: Component; selected: SelectedComponent }[]): CompatibilityResult[] {
  const consumers = items.filter((item) => item.component.roles.includes('consumer'))
  const generators = items.filter((item) => item.component.roles.includes('generator'))
  const storage = items.filter((item) => item.component.roles.includes('storage'))
  const converters = items.filter((item) => item.component.roles.includes('converter'))
  const inverter = converters.find((item) => item.component.converterType === 'dc_ac_inverter')
  const mppt = converters.find((item) => item.component.converterType === 'mppt_charge_controller')
  const checks: CompatibilityResult[] = []

  const acConsumers = consumers.filter((item) => item.component.electrical.inputType === 'ac')
  if (acConsumers.length && !inverter) checks.push(result('incompatible', 'missing-inverter', 'AC consumers are selected but no DC/AC inverter is present.', acConsumers.map((x) => x.component.id)))
  if (inverter) {
    const limit = inverter.component.electrical.output?.continuousPowerW
    const load = continuousLoad(consumers)
    checks.push(limit == null ? result('unknown', 'inverter-power-unknown', 'Inverter continuous power is unknown.', [inverter.component.id]) : result(load <= limit ? 'compatible' : 'incompatible', 'inverter-continuous-power', `${load.toFixed(0)} W continuous load versus ${limit.toFixed(0)} W inverter limit.`, [inverter.component.id]))
    const peak = inverter.component.electrical.output?.peakPowerW
    const start = startupLoad(consumers)
    checks.push(peak == null ? result('unknown', 'inverter-peak-unknown', 'Inverter peak power is unknown.', [inverter.component.id]) : result(start <= peak ? 'compatible' : 'incompatible', 'inverter-peak-power', `${start.toFixed(0)} W worst single-device startup versus ${peak.toFixed(0)} W peak limit.`, [inverter.component.id]))
    const longestStartup = Math.max(0, ...consumers.map((item) => item.component.electrical.startupDurationSeconds ?? 0))
    const peakDuration = inverter.component.electrical.output?.peakDurationSeconds
    if (longestStartup > 0) checks.push(peakDuration == null ? result('unknown', 'inverter-peak-duration-unknown', 'Inverter peak duration is unknown.', [inverter.component.id]) : result(longestStartup <= peakDuration ? 'compatible' : 'incompatible', 'inverter-peak-duration', `${longestStartup} s longest startup versus ${peakDuration} s inverter peak capability.`, [inverter.component.id]))
  }
  for (const battery of storage) {
    if (!inverter) break
    const voltage = battery.component.electrical.nominalVoltageV
    const input = inverter.component.electrical.input
    if (voltage == null || input?.minimumVoltageV == null || input.maximumVoltageV == null) checks.push(result('unknown', 'battery-voltage-unknown', 'Battery/inverter voltage compatibility cannot be determined.', [battery.component.id, inverter.component.id]))
    else checks.push(result(voltage >= input.minimumVoltageV && voltage <= input.maximumVoltageV ? 'compatible' : 'incompatible', 'battery-inverter-voltage', `${voltage} V battery nominal voltage versus ${input.minimumVoltageV}–${input.maximumVoltageV} V inverter input.`, [battery.component.id, inverter.component.id]))
    const efficiency = inverter.component.electrical.efficiency?.nominal
    const maximumCurrent = battery.component.electrical.maximumContinuousDischargeCurrentA
    const requiredCurrent = voltage == null || voltage <= 0 || efficiency == null ? null : continuousLoad(consumers) / voltage / efficiency
    if (requiredCurrent == null || maximumCurrent == null) checks.push(result('unknown', 'battery-current-unknown', 'Battery continuous discharge current cannot be determined from the available data.', [battery.component.id, inverter.component.id]))
    else checks.push(result(requiredCurrent <= maximumCurrent ? 'compatible' : 'incompatible', 'battery-discharge-current', `${requiredCurrent.toFixed(1)} A calculated demand versus ${maximumCurrent.toFixed(1)} A battery limit.`, [battery.component.id, inverter.component.id]))
  }
  for (const consumer of consumers) {
    if (!inverter) break
    const loadV = consumer.component.electrical.nominalVoltageV
    const outputV = inverter.component.electrical.output?.nominalVoltageV
    if (loadV == null || outputV == null) checks.push(result('unknown', 'consumer-voltage-unknown', `Voltage data is incomplete for ${consumer.component.name}.`, [consumer.component.id]))
    else checks.push(result(Math.abs(loadV - outputV) / loadV <= 0.05 ? 'compatible' : 'incompatible', 'consumer-voltage', `${consumer.component.name}: ${loadV} V requirement versus ${outputV} V supply.`, [consumer.component.id, inverter.component.id]))
  }
  for (const generator of generators) {
    if (!mppt) { checks.push(result('marginal', 'missing-controller', `${generator.component.name} has no selected charge controller.`, [generator.component.id])); continue }
    const voltage = generator.component.electrical.openCircuitVoltageV ?? generator.component.electrical.maximumVoltageV
    const maxV = mppt.component.electrical.maximumPvVoltageV ?? mppt.component.electrical.input?.maximumVoltageV
    const operatingV = generator.component.electrical.maximumPowerVoltageV ?? generator.component.electrical.nominalVoltageV
    const minMppt = mppt.component.electrical.mpptMinimumVoltageV
    if (voltage == null || maxV == null) checks.push(result('unknown', 'pv-voltage-unknown', 'Generator/controller maximum voltage cannot be checked.', [generator.component.id, mppt.component.id]))
    else checks.push(result(voltage <= maxV ? 'compatible' : 'incompatible', 'pv-maximum-voltage', `${voltage} V generator maximum/open-circuit voltage versus ${maxV} V controller maximum.`, [generator.component.id, mppt.component.id]))
    if (operatingV != null && minMppt != null && operatingV < minMppt) checks.push(result('marginal', 'pv-below-mppt', `${operatingV} V generator operating voltage is below the ${minMppt} V MPPT range.`, [generator.component.id, mppt.component.id]))
    const current = generator.component.electrical.shortCircuitCurrentA ?? generator.component.electrical.ratedCurrentA
    const maxCurrent = mppt.component.electrical.maximumPvCurrentA ?? mppt.component.electrical.input?.maximumCurrentA
    if (current == null || maxCurrent == null) checks.push(result('unknown', 'pv-current-unknown', 'Generator/controller current compatibility cannot be checked.', [generator.component.id, mppt.component.id]))
    else checks.push(result(current * generator.selected.quantity <= maxCurrent ? 'compatible' : 'incompatible', 'pv-input-current', `${(current * generator.selected.quantity).toFixed(1)} A generator current versus ${maxCurrent.toFixed(1)} A controller limit.`, [generator.component.id, mppt.component.id]))
  }
  if (!checks.length) checks.push(result('unknown', 'empty-system', 'Add components to evaluate compatibility.', []))
  return checks
}
