import { useState } from 'react'
import EquipmentPage from './modules/equipment/EquipmentPage'
import ServicesPage from './modules/services/ServicesPage'
import PlanningPage from './modules/planning/PlanningPage'
import {
  LayoutDashboard, Calculator, BriefcaseBusiness, Wallet, Package,
  Wrench, ChartNoAxesCombined, Settings, Menu, Bell, Plus,
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
  { name: 'Análise de mercado', icon: ChartNoAxesCombined },
]

function App() {
  const [activePage, setActivePage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-[#090d16] text-gray-200">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col border-r border-white/5 bg-[#0d1320] p-5 transition-all duration-300`}>
        <div className="mb-10 flex items-center gap-3">
          <img src="/wenlux-pricer-mark.png" alt="Símbolo WenLux Pricer" className="h-10 w-10 object-contain" />
          {sidebarOpen && <div><h1 className="font-bold leading-tight text-white">WenLux</h1><p className="text-xs font-semibold tracking-[0.22em] text-violet-300">PRICER</p></div>}
        </div>

        <p className="mb-4 text-xs uppercase tracking-widest text-gray-500">{sidebarOpen ? 'Workspace' : '•'}</p>
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const selected = activePage === item.name
            return <button key={item.name} onClick={() => setActivePage(item.name)} title={item.name} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition ${selected ? 'border border-violet-500/20 bg-violet-600/15 text-violet-300' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon size={19}/>{sidebarOpen && <span>{item.name}</span>}
            </button>
          })}
        </nav>

        <div className="mt-auto space-y-2">
          <button onClick={() => setActivePage('Configurações')} className="flex w-full items-center gap-3 rounded-xl p-3 text-sm text-gray-400 hover:bg-white/5"><Settings size={19}/>{sidebarOpen && 'Configurações'}</button>
          <div className="border-t border-white/5 pt-4 text-xs text-gray-600">{sidebarOpen && 'WenLux Pricer • v0.2'}</div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-white/5 px-6 md:px-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white" aria-label="Alternar menu"><Menu size={22}/></button>
            <div><h2 className="text-lg font-semibold">{activePage}</h2><p className="text-xs text-gray-500">Formação de preços e gestão da WenLux</p></div>
          </div>
          <button className="rounded-xl p-3 text-gray-400 hover:bg-white/5" aria-label="Notificações"><Bell size={19}/></button>
        </header>

        <section className="p-6 md:p-10">
          {activePage === 'Dashboard' ? <>
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div><h2 className="text-2xl font-bold text-white">Visão geral</h2><p className="mt-1 text-sm text-gray-500">Acompanhe os custos, serviços e metas da operação.</p></div>
              <button onClick={() => setActivePage('Serviços')} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-500"><Plus size={18}/>Novo serviço</button>
            </div>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Receita total" value="R$ 0,00" description="Nenhuma receita registrada" icon={<TrendingUp size={20}/>}/>
              <MetricCard title="Custos totais" value="R$ 0,00" description="Custos registrados" icon={<TrendingDown size={20}/>}/>
              <MetricCard title="Resultado" value="R$ 0,00" description="Receita menos custos" icon={<CircleDollarSign size={20}/>}/>
              <MetricCard title="Serviços cadastrados" value="0" description="Catálogo de serviços" icon={<BriefcaseBusiness size={20}/>}/>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="min-h-72 rounded-2xl border border-white/5 bg-[#111827] p-6 xl:col-span-2"><h3 className="font-semibold text-white">Desempenho financeiro</h3><p className="mt-1 text-sm text-gray-500">Receitas e despesas aparecerão aqui quando o módulo financeiro estiver integrado.</p><div className="flex h-48 items-center justify-center text-sm text-gray-600">Nenhum dado disponível</div></div>
              <div className="rounded-2xl border border-white/5 bg-[#111827] p-6"><h3 className="font-semibold text-white">Atividade recente</h3><p className="mt-1 text-sm text-gray-500">Seus últimos registros.</p><div className="flex h-48 items-center justify-center text-sm text-gray-600">Nenhuma atividade registrada</div></div>
            </div>
          </> : activePage === 'Equipamentos' ? <EquipmentPage/> : activePage === 'Serviços' ? <ServicesPage/> : activePage === 'Metas e planejamento' ? <PlanningPage/> : <div className="rounded-2xl border border-white/5 bg-[#111827] p-8"><h2 className="text-xl font-bold text-white">{activePage}</h2><p className="mt-2 text-gray-500">Este módulo será desenvolvido nas próximas etapas.</p></div>}
        </section>
      </main>
    </div>
  )
}

function MetricCard({ title, value, description, icon }: { title: string; value: string; description: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/5 bg-[#111827] p-5"><div className="mb-5 flex items-center justify-between"><p className="text-sm text-gray-400">{title}</p><div className="rounded-lg bg-violet-500/10 p-2 text-violet-300">{icon}</div></div><h3 className="text-2xl font-bold text-white">{value}</h3><p className="mt-2 text-xs text-gray-500">{description}</p></div>
}

export default App
