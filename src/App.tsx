
import { useState } from 'react'
import EquipmentPage from './modules/equipment/EquipmentPage'

import {
  LayoutDashboard,
  Calculator,
  BriefcaseBusiness,
  Wallet,
  Package,
  Wrench,
  ChartNoAxesCombined,
  Settings,
  Menu,
  Bell,
  Plus,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Precificação', icon: Calculator },
  { name: 'Serviços', icon: BriefcaseBusiness },
  { name: 'Despesas', icon: Wallet },
  { name: 'Equipamentos', icon: Package },
  { name: 'Manutenção', icon: Wrench },
  { name: 'Análise de mercado', icon: ChartNoAxesCombined },
]

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-200 flex">

      {/* Menu lateral */}
      <aside className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } bg-[#0d1320] border-r border-white/5 p-5 flex flex-col transition-all duration-300`}>

        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-white">
            W
          </div>

          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-lg">WenLux</h1>
              <p className="text-xs text-gray-500">PRICE</p>
            </div>
          )}
        </div>

        <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">
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
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition ${
                  selected
                    ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={19} />
                {sidebarOpen && item.name}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <button
            onClick={() => setActivePage('Configurações')}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-sm text-gray-400 hover:bg-white/5"
          >
            <Settings size={19} />
            {sidebarOpen && 'Configurações'}
          </button>

          <div className="border-t border-white/5 pt-4 text-xs text-gray-600">
            {sidebarOpen && 'WenLux Price • v0.1'}
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 min-w-0">

        <header className="h-20 border-b border-white/5 px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="font-semibold text-lg">{activePage}</h2>
              <p className="text-xs text-gray-500">
                Gestão financeira e operacional
              </p>
            </div>
          </div>

          <button className="p-3 rounded-xl hover:bg-white/5 text-gray-400">
            <Bell size={19} />
          </button>
        </header>

        <section className="p-6 md:p-10">

          {activePage === 'Dashboard' ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Visão geral
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Acompanhe o desempenho da sua operação.
                  </p>
                </div>

                <button
                  onClick={() => setActivePage('Precificação')}
                  className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 px-4 py-3 rounded-xl text-sm font-medium text-white transition"
                >
                  <Plus size={18} />
                  Novo orçamento
                </button>
              </div>

              {/* Indicadores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">

                <MetricCard
                  title="Receita total"
                  value="R$ 0,00"
                  description="Nenhuma receita registrada"
                  icon={<TrendingUp size={20} />}
                />

                <MetricCard
                  title="Custos totais"
                  value="R$ 0,00"
                  description="Custos registrados"
                  icon={<TrendingDown size={20} />}
                />

                <MetricCard
                  title="Resultado"
                  value="R$ 0,00"
                  description="Receita menos custos"
                  icon={<CircleDollarSign size={20} />}
                />

                <MetricCard
                  title="Serviços realizados"
                  value="0"
                  description="Total de entregas"
                  icon={<BriefcaseBusiness size={20} />}
                />

              </div>

              {/* Área de gráficos */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                <div className="xl:col-span-2 bg-[#111827] border border-white/5 rounded-2xl p-6 min-h-72">
                  <h3 className="font-semibold text-white">
                    Desempenho financeiro
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Receitas e despesas aparecerão aqui.
                  </p>

                  <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
                    Nenhum dado disponível
                  </div>
                </div>

                <div className="bg-[#111827] border border-white/5 rounded-2xl p-6">
                  <h3 className="font-semibold text-white">
                    Atividade recente
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Seus últimos registros.
                  </p>

                  <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
                    Nenhuma atividade registrada
                  </div>
                </div>

              </div>
            </>
          ) : activePage === 'Equipamentos' ? (
            <EquipmentPage />
          ) : (
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-white">{activePage}</h2>
              <p className="text-gray-500 mt-2">
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
    <div className="bg-[#111827] border border-white/5 rounded-2xl p-5">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-gray-400">{title}</p>
        <div className="text-violet-400 bg-violet-500/10 p-2 rounded-lg">
          {icon}
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white">{value}</h3>
      <p className="text-xs text-gray-500 mt-2">{description}</p>
    </div>
  )
}

export default App
