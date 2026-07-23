export type Role = 'generator' | 'consumer' | 'storage' | 'converter'
export type Category = Role
export type CurrentType = 'ac' | 'dc'

export interface Source {
  id?: string
  type:
    | 'manufacturer_datasheet'
    | 'manufacturer_product_page'
    | 'official_manual'
    | 'certification_document'
    | 'scientific_publication'
    | 'measurement'
    | 'reference'
  title: string
  url: string
  accessed: string
  page?: number | null
  notes?: string
}

export interface Port {
  type: CurrentType
  nominalVoltageV?: number | null
  minimumVoltageV?: number | null
  maximumVoltageV?: number | null
  maximumCurrentA?: number | null
  frequencyHz?: number | null
  continuousPowerW?: number | null
  peakPowerW?: number | null
  peakDurationSeconds?: number | null
}

export interface Electrical {
  ratedPowerW?: number | null
  nominalVoltageV?: number | null
  minimumVoltageV?: number | null
  maximumVoltageV?: number | null
  openCircuitVoltageV?: number | null
  maximumPowerVoltageV?: number | null
  ratedCurrentA?: number | null
  shortCircuitCurrentA?: number | null
  maximumPowerCurrentA?: number | null
  nominalCurrentA?: number | null
  continuousPowerW?: number | null
  startupPowerW?: number | null
  startupDurationSeconds?: number | null
  standbyPowerW?: number | null
  frequencyHz?: number | null
  powerFactor?: number | null
  inputType?: CurrentType
  outputType?: CurrentType
  nominalCapacityAh?: number | null
  nominalCapacityWh?: number | null
  usableCapacityWh?: number | null
  maximumChargeCurrentA?: number | null
  maximumContinuousDischargeCurrentA?: number | null
  maximumPeakDischargeCurrentA?: number | null
  maximumPeakDischargeDurationSeconds?: number | null
  maximumChargePowerW?: number | null
  maximumContinuousDischargePowerW?: number | null
  input?: Port
  output?: Port
  efficiency?: {
    nominal?: number | null
    curve?: { loadPercent: number; efficiency: number }[]
  }
  mpptMinimumVoltageV?: number | null
  mpptMaximumVoltageV?: number | null
  maximumPvVoltageV?: number | null
  maximumPvCurrentA?: number | null
}

export interface Operation {
  typicalDailyEnergyWh?: number | null
  energyPerCycleWh?: number | null
  maximumDepthOfDischargePercent?: number | null
  chargeEfficiency?: number | null
  dischargeEfficiency?: number | null
  selfDischargePercentPerMonth?: number | null
  productionProfile?: {
    type: 'user_defined' | 'solar' | 'constant'
    capacityFactorPercent?: number
  }
}

export interface Component {
  schemaVersion: '1.0'
  id: string
  manufacturer: string
  model: string
  name: string
  category: Category
  roles: Role[]
  description: string
  generatorType?: string
  consumerType?: string
  storageType?: string
  converterType?: string
  chemistry?: string
  electrical: Electrical
  operation: Operation
  sources: Source[]
  notes: string[]
  dataQuality: {
    level:
      | 'manufacturer_specification'
      | 'independently_measured'
      | 'estimated'
      | 'demonstration'
    confidence: 'high' | 'medium' | 'low'
  }
}

export interface SelectedComponent {
  instanceId: string
  componentId: string
  quantity: number
  enabled: boolean
  operatingPercent: number
}

export type AnswerStatus = 'yes' | 'no' | 'unknown'

export interface SimpleSystemResult {
  canRunPeak: AnswerStatus
  peakAnswer: string
  runtimeHours: number | null
  runtimeAnswer: string
  averageDemandW: number
  continuousDemandW: number
  peakDemandW: number
  averageGenerationW: number
  usableBatteryWh: number
  generationBalanceW: number
  checks: {
    status: AnswerStatus
    title: string
    detail: string
  }[]
  assumptions: string[]
}
