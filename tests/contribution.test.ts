import { describe, expect, it } from 'vitest'
import {
  issueToComponent,
  normalizeComponentId,
  parseIssueForm,
} from '../src/contribution/parser'

const body = `### Component role
consumer

### Component subtype
refrigerator

### Manufacturer
ACME GmbH

### Model
Cool 100 / EU

### Readable name
ACME Cooler

### Source URL
https://example.com/data.pdf

### Nominal or output voltage (V)
230

### Rated or continuous power (W)
90

### Startup or peak power (W)
700`

describe('component issue form', () => {
  it('normalizes component IDs', () => {
    expect(normalizeComponentId('ACME GmbH', 'Cool 100 / EU')).toBe(
      'acme-gmbh-cool-100-eu',
    )
  })

  it('parses headings including units', () => {
    expect(parseIssueForm(body)['nominal or output voltage (v)']).toBe('230')
  })

  it('creates a source-backed consumer', () => {
    const component = issueToComponent(body)
    expect(component.electrical.nominalVoltageV).toBe(230)
    expect(component.electrical.continuousPowerW).toBe(90)
    expect(component.electrical.startupPowerW).toBe(700)
    expect(component.sources).toHaveLength(1)
  })

  it('rejects missing required data', () => {
    expect(() => issueToComponent('### Component role\nconsumer')).toThrow(
      'Missing required field',
    )
  })

  it('rejects letters and units in numeric fields', () => {
    const invalid = body.replace(
      '### Rated or continuous power (W)\n90',
      '### Rated or continuous power (W)\nbattery_power',
    )
    expect(() => issueToComponent(invalid)).toThrow(
      'Rated or continuous power (W) must contain only',
    )
  })

  it('accepts a decimal comma but no additional text', () => {
    const decimal = body.replace(
      '### Rated or continuous power (W)\n90',
      '### Rated or continuous power (W)\n90,5',
    )
    expect(issueToComponent(decimal).electrical.continuousPowerW).toBe(90.5)
  })
})
