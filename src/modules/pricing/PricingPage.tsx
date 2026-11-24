import { useEffect, useState, type ReactNode } from 'react'
import { Calculator, Target, TrendingUp, AlertTriangle } from 'lucide-react'
import { db, DEFAULT_PLANNING, type Equipment, type PlanningSettings, type Service } from '../../database/db'
import { calculateMonthlyRevenueTarget, calculateServicePricing, currency } from '../../lib/pricing'

export default function PricingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [settings, setSettings] = useState<PlanningSettings>(DEFAULT_PLANNING)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [serviceRecords, equipmentRecords, planning] = await Promise.all([
        db.services.toArray(), db.equipment.toArray(), db.planning.get('main'),
      ])
      setServices(serviceRecords)
      setEquipment(equipmentRecords)
      setSettings(planning ?? DEFAULT_PLANNING)
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) return <p className="text-sm text-gray-400">Calculando preços...</p>

  const monthlyTarget = calculateMonthlyRevenueTarget(settings, equipment)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Precificação</h1>
        <p className="mt-1 text-sm text-gray-400">Consulte custos estimados e preços sugeridos a partir do planejamento da WenLux.</p>
      </div>

      {settings.desiredMonthlyRemuneration <= 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle size={20} className="shrink-0" />
          Configure a remuneração desejada e a capacidade produtiva em Metas e planejamento para habilitar uma referência de mão de obra.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric icon={<Target size={19} />} label="Meta mensal de lucro" value={currency(settings.targetMonthlyProfit)} />
        <Metric icon={<TrendingUp size={19} />} label="Meta de faturamento" value={monthlyTarget === null ? 'Revise os percentuais' : currency(monthlyTarget)} />
        <Metric icon={<Calculator size={19} />} label="Margem-alvo por serviço" value={`${settings.targetProfitMarginPercent.toLocaleString('pt-BR')}%`} />
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
          <Calculator className="mx-auto mb-3 text-gray-500" size={36} />
          <p className="font-medium text-white">Nenhum serviço para precificar</p>
          <p className="mt-1 text-sm text-gray-400">Cadastre seus serviços para visualizar os preços sugeridos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => {
            const result = calculateServicePricing(service, equipment, settings)
            return (
              <article key={service.id} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-semibold text-white">{service.name}</h2>
                    <p className="text-sm text-gray-400">{service.category} · {service.estimatedHours} horas estimadas</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-gray-500">Preço sugerido</p>
                    <p className="text-2xl font-bold text-cyan-300">{result.suggestedPrice === null ? 'Indisponível' : currency(result.suggestedPrice)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 md:grid-cols-5">
                  <SmallMetric label="Mão de obra" value={currency(result.laborCost)} />
                  <SmallMetric label="Equipamentos" value={currency(result.equipmentCost)} />
                  <SmallMetric label="Custos fixos rateados" value={currency(result.allocatedFixedCosts)} />
                  <SmallMetric label="Custo estimado" value={currency(result.directCost)} />
                  <SmallMetric label="Lucro estimado" value={result.estimatedProfit === null ? 'Indisponível' : currency(result.estimatedProfit)} />
                </div>
                {result.equipmentNeedsReview && <p className="mt-3 flex items-center gap-2 text-xs text-amber-300"><AlertTriangle size={14} /> Há equipamentos sem custo horário calculável; revise os cadastros.</p>}
              </article>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-500">Os preços são estimativas internas. Antes de enviar um orçamento, revise escopo, condições comerciais, tributos aplicáveis e referências de mercado.</p>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-slate-700 bg-slate-900 p-5"><div className="mb-3 flex items-center gap-2 text-cyan-400">{icon}<span className="text-xs text-gray-400">{label}</span></div><p className="text-xl font-bold text-white">{value}</p></div>
}
function SmallMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>
}
