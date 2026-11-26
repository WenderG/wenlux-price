
import { useEffect, useState } from 'react'
import BudgetsPage from './modules/budgets/BudgetsPage'
import EquipmentPage from './modules/equipment/EquipmentPage'
import ServicesPage from './modules/services/ServicesPage'
import PlanningPage from './modules/planning/PlanningPage'
import PricingPage from './modules/pricing/PricingPage'
import MaintenancePage from './modules/maintenance/MaintenancePage'
import ExpensesPage from './modules/expenses/ExpensesPage'
import FinancePage from './modules/finance/FinancePage'
import DashboardPage from './modules/dashboard/DashboardPage'
import {
  LayoutDashboard, Calculator, BriefcaseBusiness, Wallet, Package,
  Wrench, ChartNoAxesCombined, Settings, Menu, Bell, Plus, FileText, History,
  TrendingUp, TrendingDown, CircleDollarSign, Target,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Precificação', icon: Calculator },
  { name: 'Serviços', icon: BriefcaseBusiness },
  { name: 'Metas e planejamento', icon: Target },
  { name: 'Despesas', icon: Wallet },
  { name: 'Equipamentos', icon: Package },
  { name: 'Manutenção', icon: Wrench },
  { name: 'Orçamentos', icon: FileText },
  { name: 'Movimentações', icon: History },
  { name: 'Análise de mercado', icon: ChartNoAxesCombined },
]

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const page = (event as CustomEvent<string>).detail
      if (typeof page === 'string') setActivePage(page)
    }
    window.addEventListener('wenlux:navigate', handleNavigation)
    return () => window.removeEventListener('wenlux:navigate', handleNavigation)
  }, [])

  return (
    <div className="flex min-h-screen bg-[#090d16] text-gray-200">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col border-r border-white/5 bg-[#0d1320] p-5 transition-all duration-300`}>
        <div className="mb-8 flex min-h-20 items-center justify-center">
          {sidebarOpen ? (
            <img
              src="/wenlux-pricer-logo.png"
              alt="WenLux Pricer"
              className="w-full max-w-[210px] max-h-32 object-contain"
            />
          ) : (
            <img
              src="/wenlux-pricer-mark.png"
              alt="WenLux Pricer"
              className="h-12 w-12 object-contain"
            />
          )}
        </div>

        <p className="mb-4 text-xs uppercase tracking-widest text-gray-500">
          {sidebarOpen ? 'Workspace' : '•'}
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const selected = activePage === item.name

            return (
              <button
                key={item.name}
                onClick={() => setActivePage(item.name)}
                title={item.name}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition ${
                  selected
                    ? 'border border-violet-500/20 bg-violet-600/15 text-violet-300'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={19} />
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <button
            onClick={() => setActivePage('Configurações')}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-sm text-gray-400 hover:bg-white/5"
          >
            <Settings size={19} />
            {sidebarOpen && 'Configurações'}
          </button>

          <div className="border-t border-white/5 pt-4 text-xs text-gray-600">
            {sidebarOpen && 'WenLux Pricer • v0.3.6'}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-white/5 px-6 md:px-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white"
              aria-label="Alternar menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="text-lg font-semibold">{activePage}</h2>
              <p className="text-xs text-gray-500">
                Formação de preços e gestão da WenLux
              </p>
            </div>
          </div>

          <button
            className="rounded-xl p-3 text-gray-400 hover:bg-white/5"
            aria-label="Notificações"
          >
            <Bell size={19} />
          </button>
        </header>

        <section className="p-6 md:p-10">
          {activePage === 'Movimentações' ? (
            <FinancePage />
          ) : activePage === 'Dashboard' ? (
            <DashboardPage />
          ) : activePage === 'Precificação' ? (
            <PricingPage />
          ) : activePage === 'Equipamentos' ? (
            <EquipmentPage />
          ) : activePage === 'Manutenção' ? (
            <MaintenancePage />
          ) : activePage === 'Despesas' ? (
            <ExpensesPage />
          ) : activePage === 'Orçamentos' ? (
            <BudgetsPage />
          ) : activePage === 'Serviços' ? (
            <ServicesPage />
          ) : activePage === 'Metas e planejamento' ? (
            <PlanningPage />
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#111827] p-8">
              <h2 className="text-xl font-bold text-white">{activePage}</h2>
              <p className="mt-2 text-gray-500">
                Este módulo será desenvolvido nas próximas etapas.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111827] p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-400">{title}</p>
        <div className="rounded-lg bg-violet-500/10 p-2 text-violet-300">
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  )
}

export default App
