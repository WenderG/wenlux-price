import Dexie, { type Table } from 'dexie'

export interface Equipment {
  id?: number
  name: string
  category: string
  purchaseValue: number
  purchaseDate: string
  usefulLifeMonths: number
  residualValue: number
  productiveHoursPerMonth?: number
  notes?: string
}

export interface EquipmentUsage {
  equipmentId: number
  hours: number
}

export type EffortLevel = 'low' | 'medium' | 'high'

export interface ServiceStage {
  id: string
  name: string
  hours: number
  complexity: EffortLevel
  specialization: EffortLevel
  responsibility: EffortLevel
}

export type ServiceLevel = 'low' | 'medium' | 'high'

export interface Service {
  id?: number
  name: string
  description?: string
  category: string
  estimatedHours: number
  /** Mantido para compatibilidade com registros criados nas versões anteriores. */
  hourlyRate?: number
  /** Campos de compatibilidade com a versão 0.2 anterior. */
  complexityLevel?: ServiceLevel
  specializationLevel?: ServiceLevel
  responsibilityLevel?: ServiceLevel
  equipmentUsage?: EquipmentUsage[]
  stages?: ServiceStage[]
}

export interface Expense {
  id?: number
  description: string
  category: string
  amount: number
  type: 'fixed' | 'variable'
  date: string
}

export interface Budget {
  id?: number
  serviceId?: number
  client: string
  description: string
  estimatedCost: number
  suggestedPrice: number
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  date: string
}

export interface Transaction {
  id?: number
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

export interface PlanningSettings {
  key: 'main'
  monthlyRemuneration: number
  minimumRemunerationReference: number
  productiveHoursPerMonth: number
  fixedMonthlyCosts: number
  monthlyProfitGoal: number
  targetProfitMargin: number
  taxRate: number
  variableCostRate: number
  updatedAt: string
}

class WenLuxDatabase extends Dexie {
  equipment!: Table<Equipment, number>
  expenses!: Table<Expense, number>
  services!: Table<Service, number>
  budgets!: Table<Budget, number>
  transactions!: Table<Transaction, number>
  planningSettings!: Table<PlanningSettings, string>

  constructor() {
    super('WenLuxPriceDB')

    this.version(1).stores({
      equipment: '++id, name, category',
      expenses: '++id, description, category, type, date',
      services: '++id, name, category',
      budgets: '++id, client, status, date',
      transactions: '++id, description, type, category, date',
    })

    // Versão 2: mantém compatibilidade com a tabela de planejamento
    // utilizada na primeira entrega do WenLux Pricer.
    this.version(2).stores({
      equipment: '++id, name, category',
      expenses: '++id, description, category, type, date',
      services: '++id, name, category',
      budgets: '++id, client, status, date',
      transactions: '++id, description, type, category, date',
      planning: 'id',
    })

    // Versão 3: padroniza o nome e os campos do planejamento.
    // Se já houver configurações na tabela antiga, elas são copiadas.
    this.version(3).stores({
      equipment: '++id, name, category',
      expenses: '++id, description, category, type, date',
      services: '++id, name, category',
      budgets: '++id, client, status, date',
      transactions: '++id, description, type, category, date',
      planning: 'id',
      planningSettings: '&key',
    }).upgrade(async (tx) => {
      const previous = await tx.table('planning').get('main') as {
        minimumWageReference?: number
        desiredMonthlyRemuneration?: number
        productiveHoursPerMonth?: number
        fixedMonthlyCosts?: number
        targetMonthlyProfit?: number
        targetProfitMarginPercent?: number
        taxRatePercent?: number
        variableCostRatePercent?: number
      } | undefined

      if (previous) {
        await tx.table('planningSettings').put({
          key: 'main',
          monthlyRemuneration: previous.desiredMonthlyRemuneration ?? 0,
          minimumRemunerationReference: previous.minimumWageReference ?? 0,
          productiveHoursPerMonth: previous.productiveHoursPerMonth ?? 80,
          fixedMonthlyCosts: previous.fixedMonthlyCosts ?? 0,
          monthlyProfitGoal: previous.targetMonthlyProfit ?? 0,
          targetProfitMargin: previous.targetProfitMarginPercent ?? 20,
          taxRate: previous.taxRatePercent ?? 0,
          variableCostRate: previous.variableCostRatePercent ?? 0,
          updatedAt: new Date().toISOString(),
        })
      }
    })
  }
}

export const db = new WenLuxDatabase()
