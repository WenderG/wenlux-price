import type { Equipment, PlanningSettings, Service, ServiceLevel } from '../database/db'

const LEVEL_PREMIUM: Record<ServiceLevel, number> = {
  low: 0,
  medium: 0.05,
  high: 0.15,
}

export function currency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function getEquipmentHourlyCost(item: Equipment) {
  const productiveHours = item.productiveHoursPerMonth ?? 0
  if (productiveHours <= 0 || item.usefulLifeMonths <= 0) return null

  const monthlyDepreciation =
    (item.purchaseValue - item.residualValue) / item.usefulLifeMonths

  return monthlyDepreciation / productiveHours
}

export function calculateServicePricing(
  service: Service,
  equipment: Equipment[],
  settings: PlanningSettings,
) {
  const productiveHours = settings.productiveHoursPerMonth
  const baseHourlyRemuneration =
    productiveHours > 0
      ? settings.desiredMonthlyRemuneration / productiveHours
      : 0

  const complexity = service.complexityLevel ?? 'medium'
  const specialization = service.specializationLevel ?? 'medium'
  const responsibility = service.responsibilityLevel ?? 'medium'

  // Os adicionais são somados, evitando multiplicação composta excessiva.
  const laborAdjustment =
    LEVEL_PREMIUM[complexity] +
    LEVEL_PREMIUM[specialization] +
    LEVEL_PREMIUM[responsibility]

  const laborCost =
    baseHourlyRemuneration *
    service.estimatedHours *
    (1 + laborAdjustment)

  let equipmentCost = 0
  let equipmentNeedsReview = false

  for (const usage of service.equipmentUsage ?? []) {
    const item = equipment.find((entry) => entry.id === usage.equipmentId)
    if (!item) {
      equipmentNeedsReview = true
      continue
    }

    const hourlyCost = getEquipmentHourlyCost(item)
    if (hourlyCost === null) {
      equipmentNeedsReview = true
      continue
    }

    equipmentCost += hourlyCost * usage.hours
  }

  const fixedAllocationPerHour =
    productiveHours > 0
      ? settings.fixedMonthlyCosts / productiveHours
      : 0

  const allocatedFixedCosts =
    fixedAllocationPerHour * service.estimatedHours

  const directCost = laborCost + equipmentCost + allocatedFixedCosts
  const denominator =
    1 -
    (settings.targetProfitMarginPercent + settings.taxRatePercent +
      settings.variableCostRatePercent) / 100

  const suggestedPrice =
    denominator > 0 ? directCost / denominator : null

  const estimatedProfit =
    suggestedPrice === null
      ? null
      : suggestedPrice -
        directCost -
        suggestedPrice *
          ((settings.taxRatePercent + settings.variableCostRatePercent) / 100)

  return {
    baseHourlyRemuneration,
    laborAdjustment,
    laborCost,
    equipmentCost,
    allocatedFixedCosts,
    directCost,
    suggestedPrice,
    estimatedProfit,
    equipmentNeedsReview,
  }
}

export function calculateMonthlyRevenueTarget(settings: PlanningSettings, equipment: Equipment[] = []) {
  const contributionRate =
    1 -
    (settings.taxRatePercent + settings.variableCostRatePercent) / 100

  if (contributionRate <= 0) return null

  const monthlyEquipmentDepreciation = equipment.reduce((total, item) => {
    if (item.usefulLifeMonths <= 0) return total
    return total + (item.purchaseValue - item.residualValue) / item.usefulLifeMonths
  }, 0)

  return (
    settings.desiredMonthlyRemuneration +
    settings.fixedMonthlyCosts +
    monthlyEquipmentDepreciation +
    settings.targetMonthlyProfit
  ) / contributionRate
}
