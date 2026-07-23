import type {
  Component,
  SelectedComponent,
  SimpleSystemResult,
} from '../models/types'

export interface ActiveItem {
  component: Component
  selected: SelectedComponent
}

const total = (
  items: ActiveItem[],
  value: (component: Component) => number | null | undefined,
) =>
  items.reduce(
    (sum, item) => sum + (value(item.component) ?? 0) * item.selected.quantity,
    0,
  )

const percent = (item: ActiveItem) =>
  Math.min(100, Math.max(0, item.selected.operatingPercent)) / 100

export function calculateSimpleSystem(
  allItems: ActiveItem[],
): SimpleSystemResult {
  const items = allItems.filter((item) => item.selected.enabled)
  const consumers = items.filter((item) =>
    item.component.roles.includes('consumer'),
  )
  const generators = items.filter((item) =>
    item.component.roles.includes('generator'),
  )
  const batteries = items.filter((item) =>
    item.component.roles.includes('storage'),
  )
  const inverters = items.filter(
    (item) => item.component.converterType === 'dc_ac_inverter',
  )

  const averageDemandW = consumers.reduce(
    (sum, item) =>
      sum +
      (item.component.electrical.continuousPowerW ?? 0) *
        item.selected.quantity *
        percent(item),
    0,
  )
  const continuousDemandW = total(
    consumers,
    (component) => component.electrical.continuousPowerW,
  )
  const peakDemandW = total(
    consumers,
    (component) =>
      component.electrical.startupPowerW ??
      component.electrical.continuousPowerW,
  )
  const averageGenerationW = generators.reduce(
    (sum, item) =>
      sum +
      (item.component.electrical.ratedPowerW ?? 0) *
        item.selected.quantity *
        percent(item),
    0,
  )
  const maximumGenerationW = total(
    generators,
    (component) => component.electrical.ratedPowerW,
  )
  const usableBatteryWh = batteries.reduce(
    (sum, item) =>
      sum +
      (item.component.electrical.usableCapacityWh ?? 0) *
        item.selected.quantity *
        percent(item),
    0,
  )

  const inverterContinuousW = inverters.reduce(
    (sum, item) =>
      sum +
      (item.component.electrical.output?.continuousPowerW ?? 0) *
        item.selected.quantity *
        percent(item),
    0,
  )
  const inverterPeakW = inverters.reduce(
    (sum, item) =>
      sum +
      (item.component.electrical.output?.peakPowerW ??
        item.component.electrical.output?.continuousPowerW ??
        0) *
        item.selected.quantity *
        percent(item),
    0,
  )
  const inverterEfficiency =
    inverters[0]?.component.electrical.efficiency?.nominal ?? 1
  const batteryDischargeW = batteries.reduce(
    (sum, item) =>
      sum +
      (item.component.electrical.maximumContinuousDischargePowerW ??
        (item.component.electrical.maximumContinuousDischargeCurrentA ?? 0) *
          (item.component.electrical.nominalVoltageV ?? 0)) *
        item.selected.quantity *
        percent(item),
    0,
  )
  const batteryEfficiency =
    batteries[0]?.component.operation.dischargeEfficiency ?? 1

  const checks: SimpleSystemResult['checks'] = []

  if (!consumers.length) {
    checks.push({
      status: 'unknown',
      title: 'No consumers switched on',
      detail: 'Switch on at least one consumer to calculate a requirement.',
    })
  }

  if (consumers.length && !inverters.length) {
    checks.push({
      status: 'no',
      title: 'No inverter switched on',
      detail: 'The selected AC consumers need an enabled DC/AC inverter.',
    })
  } else if (inverters.length) {
    checks.push({
      status:
        inverterContinuousW >= continuousDemandW && inverterPeakW >= peakDemandW
          ? 'yes'
          : 'no',
      title: 'Inverter power',
      detail: `${Math.round(continuousDemandW)} W continuous and ${Math.round(peakDemandW)} W peak demand; ${Math.round(inverterContinuousW)} W continuous and ${Math.round(inverterPeakW)} W peak available.`,
    })
  }

  const requiredSourceW =
    inverterEfficiency > 0 ? peakDemandW / inverterEfficiency : peakDemandW

  if (batteries.length && batteryDischargeW > 0) {
    checks.push({
      status: batteryDischargeW >= requiredSourceW ? 'yes' : 'no',
      title: 'Battery power',
      detail: `${Math.round(requiredSourceW)} W estimated peak battery demand; ${Math.round(batteryDischargeW)} W continuous battery output available.`,
    })
  } else if (batteries.length) {
    checks.push({
      status: 'unknown',
      title: 'Battery power unknown',
      detail: 'The selected battery has no usable discharge-power limit.',
    })
  } else if (generators.length && maximumGenerationW > 0) {
    checks.push({
      status: maximumGenerationW >= requiredSourceW ? 'yes' : 'no',
      title: 'Generator power without a battery',
      detail: `${Math.round(requiredSourceW)} W estimated peak input demand; ${Math.round(maximumGenerationW)} W maximum generator power available. This only compares power and assumes suitable conversion equipment.`,
    })
  } else if (generators.length) {
    checks.push({
      status: 'unknown',
      title: 'Generator power unknown',
      detail:
        'No battery is enabled and the selected generator has no rated power.',
    })
  } else {
    checks.push({
      status: 'no',
      title: 'No power source switched on',
      detail:
        'Switch on either a battery or a generator to supply the consumers.',
    })
  }

  for (const battery of batteries) {
    for (const inverter of inverters) {
      const voltage = battery.component.electrical.nominalVoltageV
      const minimum = inverter.component.electrical.input?.minimumVoltageV
      const maximum = inverter.component.electrical.input?.maximumVoltageV
      if (voltage == null || minimum == null || maximum == null) {
        checks.push({
          status: 'unknown',
          title: 'Battery voltage unknown',
          detail: 'Battery and inverter voltage data is incomplete.',
        })
      } else {
        checks.push({
          status: voltage >= minimum && voltage <= maximum ? 'yes' : 'no',
          title: 'Battery voltage',
          detail: `${voltage} V battery; inverter accepts ${minimum}–${maximum} V.`,
        })
      }
    }
  }

  const decisiveChecks = checks.filter(
    (check) =>
      check.title === 'Inverter power' ||
      check.title === 'Battery power' ||
      check.title === 'Battery voltage' ||
      check.title === 'Generator power without a battery' ||
      check.title === 'Generator power unknown' ||
      check.title === 'No inverter switched on' ||
      check.title === 'No power source switched on',
  )
  const canRunPeak =
    !consumers.length ||
    decisiveChecks.some((check) => check.status === 'unknown')
      ? 'unknown'
      : decisiveChecks.some((check) => check.status === 'no')
        ? 'no'
        : 'yes'

  const dcAverageDemandW =
    inverterEfficiency > 0
      ? averageDemandW / inverterEfficiency
      : averageDemandW
  const runtimeHours =
    usableBatteryWh > 0 && dcAverageDemandW > 0
      ? (usableBatteryWh * batteryEfficiency) / dcAverageDemandW
      : null

  const assumptions: string[] = [
    'All enabled consumers are assumed to reach their peak at the same time.',
    'Runtime starts with a full battery and assumes no generation at all.',
    'The percentage on a consumer or generator represents its average power.',
    'The percentage on a battery represents the share of listed usable capacity available for this calculation.',
  ]
  if (inverterEfficiency === 1 && inverters.length) {
    assumptions.push(
      'Missing inverter efficiency was treated as 100%, so runtime may be optimistic.',
    )
  }

  return {
    canRunPeak,
    peakAnswer:
      canRunPeak === 'yes'
        ? 'Yes, the enabled inverter and power source pass the available rough peak-power checks.'
        : canRunPeak === 'no'
          ? 'No, at least one enabled component is below the calculated peak requirement.'
          : 'There is not enough information to answer this yet.',
    runtimeHours,
    runtimeAnswer: !batteries.length
      ? 'Cannot calculate battery runtime because no battery is switched on.'
      : runtimeHours == null
        ? 'Switch on at least one consumer with known power values.'
        : `About ${runtimeHours.toFixed(1)} hours from a full battery, assuming no generation.`,
    averageDemandW,
    continuousDemandW,
    peakDemandW,
    averageGenerationW,
    usableBatteryWh,
    generationBalanceW: averageGenerationW - averageDemandW,
    checks,
    assumptions,
  }
}
