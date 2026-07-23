import { describe, expect, it } from 'vitest'
import { calculateSimpleSystem } from '../src/calculation/core'
import type { Component, SelectedComponent } from '../src/models/types'

const source = {
  type: 'measurement' as const,
  title: 'Test measurement',
  url: 'https://example.com',
  accessed: '2026-07-23',
}
const dataQuality = {
  level: 'independently_measured' as const,
  confidence: 'high' as const,
}

const base = (
  id: string,
  category: Component['category'],
): Omit<Component, 'electrical' | 'operation'> => ({
  schemaVersion: '1.0',
  id,
  manufacturer: 'Test',
  model: id,
  name: id,
  category,
  roles: [category],
  description: '',
  sources: [source],
  notes: [],
  dataQuality,
})

const consumer: Component = {
  ...base('consumer', 'consumer'),
  consumerType: 'load',
  electrical: {
    continuousPowerW: 500,
    startupPowerW: 2000,
    inputType: 'ac',
  },
  operation: {},
}
const inverter: Component = {
  ...base('inverter', 'converter'),
  converterType: 'dc_ac_inverter',
  electrical: {
    input: { type: 'dc', minimumVoltageV: 42, maximumVoltageV: 60 },
    output: {
      type: 'ac',
      continuousPowerW: 3000,
      peakPowerW: 6000,
    },
    efficiency: { nominal: 0.9 },
  },
  operation: {},
}
const battery: Component = {
  ...base('battery', 'storage'),
  storageType: 'battery',
  electrical: {
    nominalVoltageV: 48,
    usableCapacityWh: 5000,
    maximumContinuousDischargePowerW: 5120,
  },
  operation: { dischargeEfficiency: 0.9 },
}
const generator: Component = {
  ...base('generator', 'generator'),
  generatorType: 'solar',
  electrical: { ratedPowerW: 1000 },
  operation: {},
}

const selected = (
  component: Component,
  operatingPercent: number,
  enabled = true,
): { component: Component; selected: SelectedComponent } => ({
  component,
  selected: {
    instanceId: component.id,
    componentId: component.id,
    quantity: 1,
    enabled,
    operatingPercent,
  },
})

describe('simple system calculator', () => {
  it('answers the peak-power question', () => {
    const result = calculateSimpleSystem([
      selected(consumer, 50),
      selected(inverter, 100),
      selected(battery, 100),
    ])
    expect(result.canRunPeak).toBe('yes')
    expect(result.peakDemandW).toBe(2000)
  })

  it('rejects an inverter with insufficient peak power', () => {
    const smallInverter: Component = {
      ...inverter,
      electrical: {
        ...inverter.electrical,
        output: {
          type: 'ac',
          continuousPowerW: 600,
          peakPowerW: 1000,
        },
      },
    }
    const result = calculateSimpleSystem([
      selected(consumer, 50),
      selected(smallInverter, 100),
      selected(battery, 100),
    ])
    expect(result.canRunPeak).toBe('no')
  })

  it('estimates runtime from a full battery without generation', () => {
    const result = calculateSimpleSystem([
      selected(consumer, 50),
      selected(inverter, 100),
      selected(battery, 100),
    ])
    expect(result.averageDemandW).toBe(250)
    expect(result.runtimeHours).toBeCloseTo(16.2)
  })

  it('can answer peak power without a battery when generation is sufficient', () => {
    const largeGenerator: Component = {
      ...generator,
      electrical: { ratedPowerW: 3000 },
    }
    const result = calculateSimpleSystem([
      selected(consumer, 50),
      selected(inverter, 100),
      selected(largeGenerator, 50),
    ])
    expect(result.canRunPeak).toBe('yes')
    expect(result.runtimeHours).toBeNull()
    expect(result.runtimeAnswer).toContain('no battery')
  })

  it('calculates average generation from the percentage', () => {
    const result = calculateSimpleSystem([
      selected(consumer, 50),
      selected(generator, 50),
    ])
    expect(result.averageGenerationW).toBe(500)
    expect(result.generationBalanceW).toBe(250)
  })

  it('ignores components that the user switches off', () => {
    const result = calculateSimpleSystem([
      selected(consumer, 50, false),
      selected(generator, 50),
    ])
    expect(result.averageDemandW).toBe(0)
    expect(result.canRunPeak).toBe('unknown')
  })
})
