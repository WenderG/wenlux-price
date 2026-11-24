import type { PlanningSettings, ServiceStage } from '../database/db'

export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function levelAdjustment(level: ServiceStage['complexity']): number {
  if (level === 'high') return 0.15
  if (level === 'medium') return 0.05
  return 0
}

export function getStageMultiplier(stage: ServiceStage): number {
  return 1 + levelAdjustment(stage.complexity)
    + levelAdjustment(stage.specialization)
    + levelAdjustment(stage.responsibility)
}

export interface PriceCalculation {
  totalHours: number
  laborCost: number
  fixedCostAllocation: number
  equipmentCost: number
  totalCost: number
  minimumPrice: number | null
  suggestedPrice: number | null
  estimatedProfit: number | null
  effectiveMargin: number | null
  canCalculatePrice: boolean
}

export function calculateServicePrice(input: {
  stages: ServiceStage[]
  equipmentCost: number
  settings: PlanningSettings
}): PriceCalculation {
  const { stages, equipmentCost, settings } = input
  const totalHours = stages.reduce((sum, stage) => sum + stage.hours, 0)
  const hourlyRemuneration = settings.productiveHoursPerMonth > 0
    ? settings.monthlyRemuneration / settings.productiveHoursPerMonth
    : 0
  const hourlyFixedAllocation = settings.productiveHoursPerMonth > 0
    ? settings.fixedMonthlyCosts / settings.productiveHoursPerMonth
    : 0

  const laborCost = stages.reduce(
    (sum, stage) => sum + stage.hours * hourlyRemuneration * getStageMultiplier(stage),
    0,
  )
  const fixedCostAllocation = totalHours * hourlyFixedAllocation
  const totalCost = laborCost + fixedCostAllocation + equipmentCost
  const deductions = (settings.taxRate + settings.variableCostRate) / 100
  const margin = settings.targetProfitMargin / 100
  const minimumDenominator = 1 - deductions
  const suggestedDenominator = 1 - deductions - margin
  const canCalculatePrice = settings.productiveHoursPerMonth > 0
    && settings.monthlyRemuneration > 0
    && minimumDenominator > 0
    && suggestedDenominator > 0
    && totalHours > 0

  const minimumPrice = canCalculatePrice ? totalCost / minimumDenominator : null
  const suggestedPrice = canCalculatePrice ? totalCost / suggestedDenominator : null
  const estimatedProfit = suggestedPrice === null ? null : suggestedPrice - totalCost - suggestedPrice * deductions
  const effectiveMargin = suggestedPrice && estimatedProfit !== null
    ? (estimatedProfit / suggestedPrice) * 100
    : null

  return {
    totalHours,
    laborCost,
    fixedCostAllocation,
    equipmentCost,
    totalCost,
    minimumPrice,
    suggestedPrice,
    estimatedProfit,
    effectiveMargin,
    canCalculatePrice,
  }
}

export function calculateMonthlyRevenueReference(settings: PlanningSettings): number | null {
  const deductionRate = (settings.taxRate + settings.variableCostRate) / 100
  const contributionRate = 1 - deductionRate
  if (contributionRate <= 0) return null
  return (
    settings.monthlyRemuneration
    + settings.fixedMonthlyCosts
    + settings.monthlyProfitGoal
  ) / contributionRate
}

export const DEFAULT_PLANNING_SETTINGS: PlanningSettings = {
  key: 'main',
  monthlyRemuneration: 0,
  minimumRemunerationReference: 0,
  productiveHoursPerMonth: 80,
  fixedMonthlyCosts: 0,
  monthlyProfitGoal: 0,
  targetProfitMargin: 20,
  taxRate: 0,
  variableCostRate: 0,
  updatedAt: new Date().toISOString(),
}
