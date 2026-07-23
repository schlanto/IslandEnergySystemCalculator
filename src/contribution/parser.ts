import type { Component, Role } from '../models/types'

export function normalizeComponentId(
  manufacturer: string,
  model: string,
): string {
  return `${manufacturer}-${model}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseIssueForm(body: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const pattern = /###\s+([^\r\n]+)\s*[\r\n]+([\s\S]*?)(?=\r?\n###\s|$)/g
  for (const match of body.matchAll(pattern)) {
    const value = match[2].trim()
    fields[match[1].trim().toLowerCase()] =
      value === '_No response_' ? '' : value
  }
  return fields
}

const numberOrNull = (value: string | undefined, label: string) => {
  if (!value) return null
  const normalized = value.trim().replace(',', '.')
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    throw new Error(
      `${label} must contain only a non-negative number without a unit.`,
    )
  }
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} is not a valid number.`)
  }
  return parsed
}

export function issueToComponent(
  body: string,
  fallbackDate = new Date().toISOString().slice(0, 10),
): Component {
  const fields = parseIssueForm(body)
  const role = (fields['component role'] || '').toLowerCase() as Role
  if (!['generator', 'consumer', 'storage', 'converter'].includes(role)) {
    throw new Error(
      'Component role must be generator, consumer, storage, or converter.',
    )
  }
  for (const key of ['manufacturer', 'model', 'readable name', 'source url']) {
    if (!fields[key]) throw new Error(`Missing required field: ${key}`)
  }

  let sourceUrl: URL
  try {
    sourceUrl = new URL(fields['source url'])
  } catch {
    throw new Error('Source URL is not valid.')
  }
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
    throw new Error('Source URL must use HTTP or HTTPS.')
  }

  const voltage = numberOrNull(
    fields['nominal or output voltage (v)'],
    'Nominal or output voltage (V)',
  )
  const minimumVoltage = numberOrNull(
    fields['minimum input voltage (v)'],
    'Minimum input voltage (V)',
  )
  const maximumVoltage = numberOrNull(
    fields['maximum input voltage (v)'],
    'Maximum input voltage (V)',
  )
  const power = numberOrNull(
    fields['rated or continuous power (w)'],
    'Rated or continuous power (W)',
  )
  const peakPower = numberOrNull(
    fields['startup or peak power (w)'],
    'Startup or peak power (W)',
  )
  const peakDuration = numberOrNull(
    fields['peak duration (seconds)'],
    'Peak duration (seconds)',
  )
  const capacity = numberOrNull(
    fields['usable battery capacity (wh)'],
    'Usable battery capacity (Wh)',
  )
  const batteryPower = numberOrNull(
    fields['maximum continuous battery output (w)'],
    'Maximum continuous battery output (W)',
  )
  const efficiencyPercent = numberOrNull(
    fields['efficiency (%)'],
    'Efficiency (%)',
  )
  if (efficiencyPercent != null && efficiencyPercent > 100) {
    throw new Error('Efficiency (%) must be between 0 and 100.')
  }
  const efficiency = efficiencyPercent == null ? null : efficiencyPercent / 100

  const electrical: Component['electrical'] = {}
  if (role === 'consumer') {
    electrical.nominalVoltageV = voltage
    electrical.continuousPowerW = power
    electrical.startupPowerW = peakPower
    electrical.startupDurationSeconds = peakDuration
    electrical.inputType = 'ac'
  } else if (role === 'generator') {
    electrical.nominalVoltageV = voltage
    electrical.ratedPowerW = power
    electrical.outputType = 'dc'
  } else if (role === 'storage') {
    electrical.nominalVoltageV = voltage
    electrical.nominalCapacityWh = capacity
    electrical.usableCapacityWh = capacity
    electrical.maximumContinuousDischargePowerW = batteryPower
  } else {
    electrical.input = {
      type: 'dc',
      minimumVoltageV: minimumVoltage,
      maximumVoltageV: maximumVoltage,
    }
    electrical.output = {
      type: 'ac',
      nominalVoltageV: voltage,
      continuousPowerW: power,
      peakPowerW: peakPower,
      peakDurationSeconds: peakDuration,
    }
    electrical.efficiency = { nominal: efficiency, curve: [] }
  }

  const component: Component = {
    schemaVersion: '1.0',
    id: normalizeComponentId(fields.manufacturer, fields.model),
    manufacturer: fields.manufacturer,
    model: fields.model,
    name: fields['readable name'],
    category: role,
    roles: [role],
    description: fields['short description'] || '',
    electrical,
    operation: role === 'storage' ? { dischargeEfficiency: efficiency } : {},
    sources: [
      {
        type: (fields['source type'] ||
          'manufacturer_product_page') as Component['sources'][number]['type'],
        title:
          fields['source title'] ||
          `${fields.manufacturer} ${fields.model} source`,
        url: sourceUrl.toString(),
        accessed: fields['date accessed'] || fallbackDate,
      },
    ],
    notes: fields['additional notes']
      ? [fields['additional notes']]
      : ['Generated from a community issue; technical review required.'],
    dataQuality: {
      level: 'manufacturer_specification',
      confidence: 'medium',
    },
  }

  if (role === 'consumer')
    component.consumerType = fields['component subtype'] || 'other'
  if (role === 'generator')
    component.generatorType = fields['component subtype'] || 'other'
  if (role === 'storage')
    component.storageType = fields['component subtype'] || 'battery'
  if (role === 'converter')
    component.converterType = fields['component subtype'] || 'other'

  return component
}
