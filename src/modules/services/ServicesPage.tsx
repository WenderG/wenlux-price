import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Plus, Pencil, Trash2, BriefcaseBusiness, Clock, Package,
  Calculator, X, Layers3, Sparkles,
} from 'lucide-react'
import {
  db, type Service, type Equipment, type EquipmentUsage,
  type PlanningSettings, type ServiceStage, type EffortLevel,
} from '../../database/db'
import { calculateServicePrice, DEFAULT_PLANNING_SETTINGS, parseDecimal } from '../../utils/pricing'

interface StageForm {
  id: string
  name: string
  hours: string
  complexity: EffortLevel
  specialization: EffortLevel
  responsibility: EffortLevel
}

function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function makeStage(): StageForm {
  return {
    id: crypto.randomUUID(),
    name: '',
    hours: '',
    complexity: 'low',
    specialization: 'low',
    responsibility: 'low',
  }
}

function getEquipmentHourlyCost(item: Equipment) {
  const hours = item.productiveHoursPerMonth ?? 0
  if (hours <= 0 || item.usefulLifeMonths <= 0) return 0
  return ((item.purchaseValue - item.residualValue) / item.usefulLifeMonths) / hours
}

function calculateEquipmentCost(usage: EquipmentUsage[] | undefined, equipmentList: Equipment[]) {
  if (!usage) return 0
  return usage.reduce((total, used) => {
    const item = equipmentList.find((equipment) => equipment.id === used.equipmentId)
    return item ? total + getEquipmentHourlyCost(item) * used.hours : total
  }, 0)
}

function toStages(stages: StageForm[]): ServiceStage[] {
  return stages
    .filter((stage) => stage.name.trim() && parseDecimal(stage.hours) > 0)
    .map((stage) => ({
      id: stage.id,
      name: stage.name.trim(),
      hours: parseDecimal(stage.hours),
      complexity: stage.complexity,
      specialization: stage.specialization,
      responsibility: stage.responsibility,
    }))
}

function legacyStages(service: Service): ServiceStage[] {
  if (service.stages?.length) return service.stages
  return [{
    id: 'legacy-stage', name: 'Execução do serviço', hours: service.estimatedHours,
    complexity: service.complexityLevel ?? 'low',
    specialization: service.specializationLevel ?? 'low',
    responsibility: service.responsibilityLevel ?? 'low',
  }]
}

const levelOptions: { value: EffortLevel; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
]

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [settings, setSettings] = useState<PlanningSettings>(DEFAULT_PLANNING_SETTINGS)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Audiovisual')
  const [stages, setStages] = useState<StageForm[]>([makeStage()])
  const [equipmentUsage, setEquipmentUsage] = useState<Record<number, string>>({})
  const [error, setError] = useState('')

  async function loadData() {
    const [serviceRecords, equipmentRecords, planning] = await Promise.all([
      db.services.orderBy('name').toArray(),
      db.equipment.orderBy('name').toArray(),
      db.planningSettings.get('main'),
    ])
    setServices(serviceRecords)
    setEquipmentList(equipmentRecords)
    setSettings(planning ?? DEFAULT_PLANNING_SETTINGS)
  }

  useEffect(() => {
    let active = true
    async function loadInitialData() {
      const [serviceRecords, equipmentRecords, planning] = await Promise.all([
        db.services.orderBy('name').toArray(),
        db.equipment.orderBy('name').toArray(),
        db.planningSettings.get('main'),
      ])
      if (!active) return
      setServices(serviceRecords)
      setEquipmentList(equipmentRecords)
      setSettings(planning ?? DEFAULT_PLANNING_SETTINGS)
    }
    void loadInitialData()
    return () => { active = false }
  }, [])

  function resetForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setCategory('Audiovisual')
    setStages([makeStage()])
    setEquipmentUsage({})
    setError('')
    setShowForm(false)
  }

  function handleEdit(service: Service) {
    setEditingId(service.id ?? null)
    setName(service.name)
    setDescription(service.description ?? '')
    setCategory(service.category)
    const savedStages = legacyStages(service).map((stage) => ({
      id: stage.id || crypto.randomUUID(),
      name: stage.name,
      hours: String(stage.hours),
      complexity: stage.complexity,
      specialization: stage.specialization,
      responsibility: stage.responsibility,
    }))
    setStages(savedStages.length ? savedStages : [makeStage()])
    const usage: Record<number, string> = {}
    service.equipmentUsage?.forEach((item) => { usage[item.equipmentId] = String(item.hours) })
    setEquipmentUsage(usage)
    setError('')
    setShowForm(true)
  }

  function updateStage(id: string, field: keyof StageForm, value: string) {
    setStages((current) => current.map((stage) => stage.id === id ? { ...stage, [field]: value } : stage))
  }

  function handleEquipmentChange(equipmentId: number, value: string) {
    setEquipmentUsage((current) => {
      const updated = { ...current }
      if (value === '') delete updated[equipmentId]
      else updated[equipmentId] = value
      return updated
    })
  }

  const selectedUsage: EquipmentUsage[] = useMemo(() => Object.entries(equipmentUsage)
    .filter(([, hours]) => parseDecimal(hours) > 0)
    .map(([id, hours]) => ({ equipmentId: Number(id), hours: parseDecimal(hours) })), [equipmentUsage])

  const normalizedStages = useMemo(() => toStages(stages), [stages])
  const equipmentCost = calculateEquipmentCost(selectedUsage, equipmentList)
  const calculation = calculateServicePrice({ stages: normalizedStages, equipmentCost, settings })
  const hasPlanning = settings.monthlyRemuneration > 0 && settings.productiveHoursPerMonth > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!name.trim()) { setError('Informe o nome do serviço.'); return }
    if (normalizedStages.length === 0) {
      setError('Adicione ao menos uma etapa com nome e horas estimadas maiores que zero.')
      return
    }
    const invalidUsage = Object.values(equipmentUsage).some((value) => parseDecimal(value) <= 0)
    if (invalidUsage) { setError('Confira as horas de utilização dos equipamentos.'); return }

    const totalHours = normalizedStages.reduce((sum, stage) => sum + stage.hours, 0)
    const serviceData: Service = {
      name: name.trim(), description: description.trim(), category,
      estimatedHours: totalHours, hourlyRate: 0,
      stages: normalizedStages,
      equipmentUsage: selectedUsage,
    }

    try {
      if (editingId !== null) await db.services.put({ ...serviceData, id: editingId })
      else await db.services.add(serviceData)
      resetForm()
      await loadData()
    } catch {
      setError('Não foi possível salvar o serviço.')
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Tem certeza que deseja excluir este serviço?')) return
    await db.services.delete(id)
    await loadData()
  }

  function priceForService(service: Service) {
    return calculateServicePrice({
      stages: legacyStages(service),
      equipmentCost: calculateEquipmentCost(service.equipmentUsage, equipmentList),
      settings,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Serviços</h1>
          <p className="mt-1 text-sm text-gray-400">Divida cada trabalho em etapas e deixe o Pricer estimar o custo e o preço.</p>
        </div>
        <button onClick={() => showForm ? resetForm() : (setEditingId(null), setStages([makeStage()]), setError(''), setShowForm(true))} className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white transition hover:bg-violet-500">
          {showForm ? <X size={18}/> : <Plus size={18}/>} {showForm ? 'Fechar formulário' : 'Novo serviço'}
        </button>
      </div>

      {!hasPlanning && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          Configure primeiro sua remuneração e horas produtivas em <strong>Metas e planejamento</strong>. Sem esses dados, o Pricer não consegue calcular a mão de obra e o preço sugerido.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-white">{editingId !== null ? 'Editar serviço' : 'Cadastrar serviço'}</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Nome do serviço</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Filmagem aérea de imóvel" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-violet-500"/>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-violet-500">
                <option>Audiovisual</option><option>Filmagem com drone</option><option>Inspeção</option><option>Desenvolvimento web</option><option>Manutenção</option><option>Consultoria</option><option>Outro</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-gray-300">Descrição</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Descreva o escopo e o que será entregue..." className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-violet-500"/>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Layers3 className="text-violet-400" size={19}/><h3 className="font-semibold text-white">Etapas e esforço de trabalho</h3></div>
              <button type="button" onClick={() => setStages((current) => [...current, makeStage()])} className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-gray-200 hover:bg-slate-800"><Plus size={16}/>Adicionar etapa</button>
            </div>
            <p className="mb-4 text-xs text-gray-500">Informe o tempo de cada etapa. Os níveis ajustam a estimativa de mão de obra: baixa (0%), média (+5%) e alta (+15%) por critério. São parâmetros iniciais e deverão ser calibrados com a experiência da WenLux.</p>
            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div key={stage.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">Etapa {index + 1}</span>
                    {stages.length > 1 && <button type="button" onClick={() => setStages((current) => current.filter((item) => item.id !== stage.id))} className="rounded p-1 text-gray-500 hover:text-red-400" title="Remover etapa"><Trash2 size={16}/></button>}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="xl:col-span-2"><label className="mb-1 block text-xs text-gray-400">Nome da etapa</label><input value={stage.name} onChange={(e) => updateStage(stage.id, 'name', e.target.value)} placeholder="Ex.: Planejamento e briefing" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"/></div>
                    <div><label className="mb-1 block text-xs text-gray-400">Horas estimadas</label><input type="text" inputMode="decimal" value={stage.hours} onChange={(e) => updateStage(stage.id, 'hours', e.target.value)} placeholder="Ex.: 1,5" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"/></div>
                    <div><label className="mb-1 block text-xs text-gray-400">Complexidade</label><select value={stage.complexity} onChange={(e) => updateStage(stage.id, 'complexity', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">{levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                    <div><label className="mb-1 block text-xs text-gray-400">Especialização</label><select value={stage.specialization} onChange={(e) => updateStage(stage.id, 'specialization', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">{levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                    <div><label className="mb-1 block text-xs text-gray-400">Responsabilidade</label><select value={stage.responsibility} onChange={(e) => updateStage(stage.id, 'responsibility', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">{levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5">
            <div className="mb-3 flex items-center gap-2"><Package className="text-violet-400" size={19}/><h3 className="font-semibold text-white">Equipamentos utilizados</h3></div>
            {equipmentList.length === 0 ? <p className="rounded-lg bg-slate-800 p-4 text-sm text-gray-400">Nenhum equipamento cadastrado.</p> : <div className="space-y-3">{equipmentList.map((item) => {
              const selected = equipmentUsage[item.id!] !== undefined
              const hourlyCost = getEquipmentHourlyCost(item)
              return <div key={item.id} className="grid grid-cols-1 items-center gap-3 rounded-lg bg-slate-800 p-3 sm:grid-cols-[1fr_150px]">
                <label className="flex items-center gap-3"><input type="checkbox" checked={selected} onChange={(e) => handleEquipmentChange(item.id!, e.target.checked ? '1' : '')} className="h-4 w-4 accent-violet-500"/><span><span className="block text-sm font-medium text-white">{item.name}</span><span className="text-xs text-gray-400">{item.category} · {currency(hourlyCost)}/h de depreciação</span>{item.productiveHoursPerMonth ? null : <span className="block text-xs text-amber-300">Horas produtivas não configuradas</span>}</span></label>
                {selected && <div><label className="mb-1 block text-xs text-gray-400">Horas de utilização</label><input type="text" inputMode="decimal" value={equipmentUsage[item.id!] ?? ''} onChange={(e) => handleEquipmentChange(item.id!, e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"/></div>}
              </div>
            })}</div>}
          </div>

          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="mb-3 flex items-center gap-2"><Calculator size={18} className="text-violet-300"/><h3 className="font-semibold text-white">Memória de cálculo</h3></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-gray-400">Tempo total</span><span className="text-white">{calculation.totalHours.toLocaleString('pt-BR')} h</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-400">Mão de obra estimada</span><span className="text-white">{currency(calculation.laborCost)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-400">Rateio de custos fixos</span><span className="text-white">{currency(calculation.fixedCostAllocation)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-400">Depreciação dos equipamentos</span><span className="text-white">{currency(equipmentCost)}</span></div>
              <div className="flex justify-between gap-3 border-t border-slate-700 pt-3"><span className="font-semibold text-white">Custo estimado</span><span className="font-bold text-violet-200">{currency(calculation.totalCost)}</span></div>
              {calculation.canCalculatePrice ? <>
                <div className="flex justify-between gap-3"><span className="text-gray-400">Preço mínimo sustentável</span><span className="font-medium text-white">{currency(calculation.minimumPrice ?? 0)}</span></div>
                <div className="flex justify-between gap-3 rounded-lg bg-violet-500/10 p-3"><span className="font-semibold text-violet-100">Preço recomendado</span><span className="text-lg font-bold text-violet-200">{currency(calculation.suggestedPrice ?? 0)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-gray-400">Lucro estimado neste serviço</span><span className="font-medium text-emerald-300">{currency(calculation.estimatedProfit ?? 0)}</span></div>
              </> : <p className="rounded-lg bg-slate-800 p-3 text-xs text-amber-200">Preencha a remuneração mensal e as horas produtivas em Metas e planejamento para calcular os preços.</p>}
            </div>
            <p className="mt-3 text-xs text-gray-500">Os ajustes por nível são parâmetros iniciais editáveis em versões futuras. O preço não é uma cotação de mercado; ele reflete os dados e premissas cadastrados.</p>
          </div>

          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <div className="flex flex-wrap gap-3"><button type="submit" className="rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white transition hover:bg-violet-500">{editingId !== null ? 'Salvar alterações' : 'Cadastrar serviço'}</button><button type="button" onClick={resetForm} className="rounded-lg border border-slate-700 px-5 py-2.5 text-gray-300 transition hover:bg-slate-800">Cancelar</button></div>
        </form>
      )}

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center"><BriefcaseBusiness className="mx-auto mb-3 text-gray-500" size={36}/><p className="font-medium text-white">Nenhum serviço cadastrado</p><p className="mt-1 text-sm text-gray-400">Cadastre seus serviços para começar a estimar custos e preços.</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{services.map((service) => {
          const result = priceForService(service)
          const serviceStages = legacyStages(service)
          return <div key={service.id} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-lg bg-violet-500/10 p-3 text-violet-300"><BriefcaseBusiness size={22}/></div><div><h3 className="font-semibold text-white">{service.name}</h3><p className="text-sm text-gray-400">{service.category}</p></div></div><div className="flex gap-1"><button onClick={() => handleEdit(service)} title="Editar serviço" className="rounded-lg p-2 text-gray-400 hover:bg-violet-500/10 hover:text-violet-300"><Pencil size={18}/></button><button onClick={() => service.id && handleDelete(service.id)} title="Excluir serviço" className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={18}/></button></div></div>
            {service.description && <p className="mt-4 text-sm text-gray-400">{service.description}</p>}
            <div className="mt-4 space-y-1">{serviceStages.map((stage) => <div key={stage.id} className="flex justify-between gap-3 text-xs text-gray-500"><span>{stage.name}</span><span>{stage.hours} h</span></div>)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-gray-500">Custo estimado</p><p className="mt-1 font-semibold text-white">{currency(result.totalCost)}</p></div><div className="rounded-lg bg-violet-500/10 p-3"><p className="text-xs text-violet-200">Preço recomendado</p><p className="mt-1 font-semibold text-violet-100">{result.suggestedPrice === null ? 'Configure o planejamento' : currency(result.suggestedPrice)}</p></div></div>
            <p className="mt-3 flex items-center gap-2 text-xs text-gray-500"><Clock size={13}/>{service.estimatedHours} horas totais <Sparkles size={13} className="ml-1"/> Cálculo baseado nas premissas atuais</p>
          </div>
        })}</div>
      )}
    </div>
  )
}
