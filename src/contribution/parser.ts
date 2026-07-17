import type { Component, Role } from '../models/types'

export function normalizeComponentId(manufacturer: string, model: string): string {
  return `${manufacturer}-${model}`.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function parseIssueForm(body: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const pattern = /###\s+([^\r\n]+)\s*[\r\n]+([\s\S]*?)(?=\r?\n###\s|$)/g
  for (const match of body.matchAll(pattern)) {
    const value = match[2].trim()
    fields[match[1].trim().toLowerCase()] = value === '_No response_' ? '' : value
  }
  return fields
}

const numberOrNull = (value?: string) => {
  if (!value) return null
  const parsed = Number(value.replace(',', '.').match(/-?\d+(?:\.\d+)?/)?.[0])
  return Number.isFinite(parsed) ? parsed : null
}

export function issueToComponent(body: string, accessed = new Date().toISOString().slice(0, 10)): Component {
  const fields = parseIssueForm(body)
  const role = (fields['component role'] || '').toLowerCase() as Role
  if (!['generator', 'consumer', 'storage', 'converter'].includes(role)) throw new Error('Component role must be generator, consumer, storage, or converter.')
  for (const key of ['manufacturer', 'model', 'readable name', 'source url']) if (!fields[key]) throw new Error(`Missing required field: ${key}`)
  let sourceUrl: URL
  try { sourceUrl = new URL(fields['source url']) } catch { throw new Error('Source URL is not valid.') }
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) throw new Error('Source URL must use HTTP or HTTPS.')
  const electrical: Component['electrical'] = { nominalVoltageV: numberOrNull(fields['nominal voltage']), nominalCurrentA: numberOrNull(fields['nominal current']), ratedPowerW: numberOrNull(fields['rated power']), continuousPowerW: numberOrNull(fields['continuous power']), startupPowerW: numberOrNull(fields['startup / peak power']), startupDurationSeconds: numberOrNull(fields['startup / peak duration']), frequencyHz: numberOrNull(fields.frequency) }
  const component: Component = { schemaVersion: '1.0', id: normalizeComponentId(fields.manufacturer, fields.model), manufacturer: fields.manufacturer, model: fields.model, name: fields['readable name'], category: role, roles: [role], description: fields.description || '', electrical, operation: {}, sources: [{ type: (fields['source type'] || 'manufacturer_product_page') as Component['sources'][number]['type'], title: fields['source title'] || `${fields.manufacturer} ${fields.model} source`, url: sourceUrl.toString(), accessed: fields['date accessed'] || accessed, page: numberOrNull(fields['page number']), notes: fields['source notes'] || undefined }], notes: ['Generated from a community issue; technical review required.'], dataQuality: { level: 'manufacturer_specification', confidence: 'medium' } }
  if (role === 'consumer') component.consumerType = fields['component subtype'] || 'other'
  if (role === 'generator') component.generatorType = fields['component subtype'] || 'other'
  if (role === 'storage') component.storageType = fields['component subtype'] || 'battery'
  if (role === 'converter') component.converterType = fields['component subtype'] || 'other'
  return component
}
