import { useEffect, useState, type FormEvent } from 'react'
import { Calculator, Save, Target, Wallet, Clock3, CircleHelp } from 'lucide-react'
import { db, type PlanningSettings } from '../../database/db'
import { calculateMonthlyRevenueReference, DEFAULT_PLANNING_SETTINGS, parseDecimal } from '../../utils/pricing'

function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function displayNumber(value: number) {
  return value === 0 ? '' : String(value)
}

export default function PlanningPage() {
  const [settings, setSettings] = useState<PlanningSettings>(DEFAULT_PLANNING_SETTINGS)
  const [fields, setFields] = useState({
    monthlyRemuneration: '',
    minimumRemunerationReference: '',
    productiveHoursPerMonth: '80',
    fixedMonthlyCosts: '',
    monthlyProfitGoal: '',
    targetProfitMargin: '20',
    taxRate: '',
    variableCostRate: '',
  })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        let current = await db.planningSettings.get('main')
        if (!current) {
          current = { ...DEFAULT_PLANNING_SETTINGS, updatedAt: new Date().toISOString() }
          await db.planningSettings.put(current)
        }
        setSettings(current)
        setFields({
          monthlyRemuneration: displayNumber(current.monthlyRemuneration),
          minimumRemunerationReference: displayNumber(current.minimumRemunerationReference),
          productiveHoursPerMonth: displayNumber(current.productiveHoursPerMonth),
          fixedMonthlyCosts: displayNumber(current.fixedMonthlyCosts),
          monthlyProfitGoal: displayNumber(current.monthlyProfitGoal),
          targetProfitMargin: displayNumber(current.targetProfitMargin),
          taxRate: displayNumber(current.taxRate),
          variableCostRate: displayNumber(current.variableCostRate),
        })
      } catch {
        setError('Não foi possível carregar o planejamento financeiro.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function updateField(name: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [name]: value }))
    setSaved(false)
  }

  const numeric = {
    monthlyRemuneration: parseDecimal(fields.monthlyRemuneration),
    minimumRemunerationReference: parseDecimal(fields.minimumRemunerationReference),
    productiveHoursPerMonth: parseDecimal(fields.productiveHoursPerMonth),
    fixedMonthlyCosts: parseDecimal(fields.fixedMonthlyCosts),
    monthlyProfitGoal: parseDecimal(fields.monthlyProfitGoal),
    targetProfitMargin: parseDecimal(fields.targetProfitMargin),
    taxRate: parseDecimal(fields.taxRate),
    variableCostRate: parseDecimal(fields.variableCostRate),
  }

  const monthlyRevenue = calculateMonthlyRevenueReference({
    ...settings,
    ...numeric,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaved(false)

    if (numeric.monthlyRemuneration <= 0) {
      setError('Informe uma remuneração mensal desejada maior que zero.')
      return
    }
    if (numeric.productiveHoursPerMonth <= 0) {
      setError('Informe uma quantidade de horas produtivas maior que zero.')
      return
    }
    if (Object.values(numeric).some((value) => value < 0)) {
      setError('Os valores não podem ser negativos.')
      return
    }
    if (numeric.taxRate + numeric.variableCostRate + numeric.targetProfitMargin >= 100) {
      setError('A soma de tributos, custos variáveis e margem precisa ser inferior a 100%.')
      return
    }

    const updated: PlanningSettings = {
      key: 'main',
      ...numeric,
      updatedAt: new Date().toISOString(),
    }

    try {
      await db.planningSettings.put(updated)
      setSettings(updated)
      setSaved(true)
    } catch {
      setError('Não foi possível salvar o planejamento.')
    }
  }

  function field(
    name: keyof typeof fields,
    label: string,
    placeholder: string,
    help: string,
    suffix?: string,
  ) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-300" htmlFor={name}>{label}</label>
        <div className="relative">
          <input
            id={name}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={fields[name]}
            onChange={(event) => updateField(name, event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none transition focus:border-violet-500"
          />
          {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{suffix}</span>}
        </div>
        <p className="mt-1 text-xs text-gray-500">{help}</p>
      </div>
    )
  }

  if (loading) return <div className="text-sm text-gray-400">Carregando planejamento...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Metas e planejamento</h1>
        <p className="mt-1 text-sm text-gray-400">Defina os parâmetros financeiros que o Pricer utilizará na formação dos preços.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="mb-5 flex items-center gap-2">
            <Wallet className="text-violet-400" size={20}/>
            <div>
              <h2 className="font-semibold text-white">Remuneração e capacidade produtiva</h2>
              <p className="text-xs text-gray-500">A remuneração desejada é tratada como custo do trabalho, não como lucro.</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {field('monthlyRemuneration', 'Remuneração mensal desejada (R$)', 'Ex.: 3000', 'Quanto você pretende receber mensalmente pelo trabalho realizado.')}
            {field('minimumRemunerationReference', 'Referência mínima de remuneração (R$)', 'Ex.: valor de referência', 'Campo opcional para registrar o piso que deseja usar como referência. Atualize conforme o salário mínimo vigente ou sua realidade.')}
            {field('productiveHoursPerMonth', 'Horas produtivas por mês', 'Ex.: 80', 'Considere apenas horas que podem ser efetivamente dedicadas a serviços remunerados.', 'h/mês')}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="mb-5 flex items-center gap-2">
            <Target className="text-violet-400" size={20}/>
            <div>
              <h2 className="font-semibold text-white">Custos e metas de resultado</h2>
              <p className="text-xs text-gray-500">A margem por serviço e a meta mensal de lucro são objetivos diferentes e serão acompanhados separadamente.</p>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {field('fixedMonthlyCosts', 'Custos fixos mensais (R$)', 'Ex.: 800', 'Despesas recorrentes da operação. Não inclua aqui a depreciação dos equipamentos, que será calculada à parte.')}
            {field('monthlyProfitGoal', 'Meta de lucro mensal (R$)', 'Ex.: 1500', 'Quanto deseja que sobre para a empresa após remunerar o trabalho e cobrir os custos.')}
            {field('targetProfitMargin', 'Margem de lucro desejada por serviço', 'Ex.: 20', 'Percentual do preço de venda destinado ao lucro, após custos e percentuais informados.', '%')}
            {field('taxRate', 'Tributos estimados sobre a venda', 'Ex.: 6', 'Informe uma estimativa percentual. Não substitui orientação contábil.', '%')}
            {field('variableCostRate', 'Outros custos variáveis sobre a venda', 'Ex.: 2', 'Percentual para taxas ou custos variáveis proporcionais ao valor cobrado.', '%')}
          </div>
        </section>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Calculator size={19} className="text-violet-300"/>
            <h2 className="font-semibold text-white">Referência de faturamento mensal</h2>
          </div>
          <p className="text-sm text-gray-400">Estimativa necessária para cobrir remuneração, custos fixos e meta de lucro, considerando os percentuais de tributos e custos variáveis informados.</p>
          <p className="mt-3 text-3xl font-bold text-violet-200">{monthlyRevenue === null || numeric.monthlyRemuneration <= 0 || numeric.productiveHoursPerMonth <= 0 ? 'Preencha os dados' : currency(monthlyRevenue)}</p>
          <p className="mt-2 flex items-start gap-2 text-xs text-gray-500"><CircleHelp size={14} className="mt-0.5 shrink-0"/>É uma referência de planejamento, não uma previsão de vendas. Custos específicos de cada serviço, como depreciação, deslocamento e materiais, serão calculados no orçamento.</p>
        </div>

        {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {saved && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">Planejamento salvo com sucesso.</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white transition hover:bg-violet-500"><Save size={17}/>Salvar planejamento</button>
          <span className="flex items-center gap-2 text-xs text-gray-500"><Clock3 size={14}/>Os valores são armazenados localmente neste navegador.</span>
        </div>
      </form>
    </div>
  )
}
