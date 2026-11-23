
import Dexie, { type Table } from 'dexie'

// Equipamentos
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

// Equipamentos utilizados em um serviço
export interface EquipmentUsage {
  equipmentId: number
  hours: number
}

// Despesas
export interface Expense {
  id?: number
  description: string
  category: string
  amount: number
  type: 'fixed' | 'variable'
  date: string
}

// Serviços
export interface Service {
  id?: number
  name: string
  description?: string
  category: string
  estimatedHours: number
  hourlyRate: number
  equipmentUsage?: EquipmentUsage[]
}

// Orçamentos
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

// Movimentações financeiras
export interface Transaction {
  id?: number
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

// Banco de dados
class WenLuxDatabase extends Dexie {
  equipment!: Table<Equipment, number>
  expenses!: Table<Expense, number>
  services!: Table<Service, number>
  budgets!: Table<Budget, number>
  transactions!: Table<Transaction, number>

  constructor() {
    super('WenLuxPriceDB')

    this.version(1).stores({
      equipment: '++id, name, category',
      expenses: '++id, description, category, type, date',
      services: '++id, name, category',
      budgets: '++id, client, status, date',
      transactions: '++id, description, type, category, date',
    })
  }
}

export const db = new WenLuxDatabase()
