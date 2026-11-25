
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Calculator, BriefcaseBusiness, Clock, Package,
  Boxes, PlusCircle, CircleDollarSign, Save, AlertTriangle,
} from 'lucide-react'
import {
  db,
  type Service,
  type Equipment,
  type EquipmentUsage,
  type PlanningSettings,
  type ServiceStage,
} from '../../database/db'
import {
  calculateServicePrice,
  DEFAULT_PLANNING_SETTINGS,
  parseDecimal,
} from '../../utils/pricing'

function currency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function localDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function legacyStages(service: Service): ServiceStage[] {
  if (service.stages?.length) return service.stages

  return [{
    id: 'legacy-stage',
    name: 'Execução do serviço',
    hours: service.estimatedHours,
    complexity: service.complexityLevel ?? 'low',
    specialization: service.specializationLevel ?? 'low',
    responsibility: service.responsibilityLevel ?? 'low',
  }]
}

function getEquipmentHourlyCost(item: Equipment) {
  const hours = item.productiveHoursPerMonth ?? 0

  if (hours <= 0 || item.usefulLifeMonths <= 0) return 0

  return (
    (item.purchaseValue - item.residualValue)
    / item.usefulLifeMonths
  ) / hours
}

function calculateEquipmentCost(
  usage: EquipmentUsage[] | undefined,
  equipmentList: Equipment[],
) {
  if (!usage) return 0

  return usage.reduce((total, used) => {
    const item = equipmentList.find(
      (equipment) => equipment.id === used.equipmentId,
    )

    return item
      ? total + getEquipmentHourlyCost(item) * used.hours
      : total
  }, 0)
}

function Field({
  label,
  value,
  onChange,
  placeholder = '0,00',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-gray-400">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none transition focus:border-violet-500"
      />
    </label>
  )
}

export default function PricingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [settings, setSettings] = useState<PlanningSettings>(
    DEFAULT_PLANNING_SETTINGS,
  )

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [client, setClient] = useState('')
  const [description, setDescription] = useState('')

  const [travelCost, setTravelCost] = useState('')
  const [materialsCost, setMaterialsCost] = useState('')
  const [otherCost, setOtherCost] = useState('')
  const [customPrice, setCustomPrice] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        const [serviceRecords, equipmentRecords, planning] =
          await Promise.all([
            db.services.orderBy('name').toArray(),
            db.equipment.orderBy('name').toArray(),
            db.planningSettings.get('main'),
          ])

        if (!active) return

        setServices(serviceRecords)
        setEquipmentList(equipmentRecords)
        setSettings(planning ?? DEFAULT_PLANNING_SETTINGS)

        if (serviceRecords.length > 0) {
          setSelectedServiceId(String(serviceRecords[0].id))
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar os dados da precificação.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [])

  const selectedService = useMemo(
    () => services.find(
      (service) => String(service.id) === selectedServiceId,
    ),
    [services, selectedServiceId],
  )

  const stages = useMemo(
    () => selectedService ? legacyStages(selectedService) : [],
    [selectedService],
  )

  const equipmentDepreciation = useMemo(
    () => selectedService
      ? calculateEquipmentCost(
          selectedService.equipmentUsage,
          equipmentList,
        )
      : 0,
    [selectedService, equipmentList],
  )

  const serviceSpecificCosts =
    Math.max(0, parseDecimal(travelCost))
    + Math.max(0, parseDecimal(materialsCost))
    + Math.max(0, parseDecimal(otherCost))

  const totalEquipmentAndSpecificCosts =
    equipmentDepreciation + serviceSpecificCosts

  const calculation = useMemo(
    () => calculateServicePrice({
      stages,
      equipmentCost: totalEquipmentAndSpecificCosts,
      settings,
    }),
    [stages, totalEquipmentAndSpecificCosts, settings],
  )

  const deductions =
    (settings.taxRate + settings.variableCostRate) / 100

  const enteredPrice = customPrice.trim()
    ? Math.max(0, parseDecimal(customPrice))
    : null

  const appliedPrice = enteredPrice !== null
    ? enteredPrice
    : calculation.suggestedPrice

  const estimatedProfit = appliedPrice !== null
    ? appliedPrice - calculation.totalCost - appliedPrice * deductions
    : null

  const effectiveMargin = appliedPrice && estimatedProfit !== null
    ? (estimatedProfit / appliedPrice) * 100
    : null

  const hasPlanning =
    settings.monthlyRemuneration > 0
    && settings.productiveHoursPerMonth > 0

  const equipmentWithoutHours = selectedService?.equipmentUsage?.filter(
    (usage) => {
      const item = equipmentList.find(
        (equipment) => equipment.id === usage.equipmentId,
      )

      return !item || !item.productiveHoursPerMonth
    },
  ) ?? []

  function resetQuote() {
    setClient('')
    setDescription('')
    setTravelCost('')
    setMaterialsCost('')
    setOtherCost('')
    setCustomPrice('')
    setError('')
    setSuccess('')
  }

  async function handleSaveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedService || selectedService.id === undefined) {
      setError('Selecione um serviço cadastrado.')
      return
    }

    if (!client.trim()) {
      setError('Informe o nome do cliente.')
      return
    }

    if (!calculation.canCalculatePrice) {
      setError('Configure o planejamento antes de gerar o orçamento.')
      return
    }

    if (appliedPrice === null || appliedPrice <= 0) {
      setError('O preço do orçamento precisa ser maior que zero.')
      return
    }

    if (appliedPrice < (calculation.minimumPrice ?? 0)) {
      setError('O preço informado está abaixo do preço mínimo sustentável. Revise o valor antes de salvar.')
      return
    }

    setSaving(true)

    try {
      const extraDetails = [
        travelCost.trim() && `Deslocamento pontual: ${currency(parseDecimal(travelCost))}`,
        materialsCost.trim() && `Materiais exclusivos: ${currency(parseDecimal(materialsCost))}`,
        otherCost.trim() && `Outros custos específicos: ${currency(parseDecimal(otherCost))}`,
      ].filter(Boolean).join(' | ')

      const budgetDescription = [
        selectedService.name,
        description.trim(),
        extraDetails,
        customPrice.trim() ? 'Preço personalizado' : 'Preço recomendado',
      ].filter(Boolean).join(' — ')

      await db.budgets.add({
        serviceId: selectedService.id,
        client: client.trim(),
        description: budgetDescription,
        estimatedCost: calculation.totalCost,
        suggestedPrice: appliedPrice,
        status: 'draft',
        date: localDate(),
      })

      setSuccess('Orçamento salvo como rascunho com sucesso.')
    } catch {
      setError('Não foi possível salvar o orçamento.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/5 bg-[#111827] p-8 text-center text-gray-400">
        Carregando dados da precificação...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Precificação</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monte orçamentos, estime custos e avalie a rentabilidade dos serviços.
        </p>
      </div>

      {!hasPlanning && (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <AlertTriangle className="shrink-0" size={20} />
          <p>
            Configure sua remuneração mensal e as horas produtivas em
            <strong> Metas e planejamento</strong> antes de gerar preços.
          </p>
        </div>
      )}

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
          <BriefcaseBusiness className="mx-auto mb-3 text-gray-500" size={36} />
          <p className="font-medium text-white">Nenhum serviço cadastrado</p>
          <p className="mt-1 text-sm text-gray-400">
            Cadastre um serviço antes de iniciar uma precificação.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <section className="rounded-xl border border-white/5 bg-[#111827] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BriefcaseBusiness className="text-violet-400" size={20} />
                  <h2 className="font-semibold text-white">Serviço</h2>
                </div>

                <label className="mb-4 block">
                  <span className="mb-1.5 block text-sm text-gray-400">
                    Serviço cadastrado
                  </span>
                  <select
                    value={selectedServiceId}
                    onChange={(event) => {
                      setSelectedServiceId(event.target.value)
                      setSuccess('')
                      setError('')
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-violet-500"
                  >
                    {services.map((service) => (
                      <option key={service.id} value={String(service.id)}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedService && (
                  <>
                    <div className="rounded-lg bg-slate-800/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">
                            {selectedService.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {selectedService.category}
                          </p>
                        </div>
                        <span className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs text-violet-200">
                          {calculation.totalHours.toLocaleString('pt-BR')} horas
                        </span>
                      </div>

                      {selectedService.description && (
                        <p className="mt-3 text-sm text-gray-400">
                          {selectedService.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-300">
                        Etapas incluídas
                      </p>
                      {stages.map((stage) => (
                        <div
                          key={stage.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/50 px-3 py-2 text-sm"
                        >
                          <span className="text-gray-300">{stage.name}</span>
                          <span className="whitespace-nowrap text-gray-400">
                            {stage.hours.toLocaleString('pt-BR')} h
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              <section className="rounded-xl border border-white/5 bg-[#111827] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <PlusCircle className="text-violet-400" size={20} />
                  <h2 className="font-semibold text-white">
                    Custos específicos do serviço
                  </h2>
                </div>

                <p className="mb-4 text-xs text-gray-500">
                  Informe somente gastos extraordinários causados por este serviço
                  e que ainda não estejam contemplados no Planejamento. Não
                  repita despesas fixas ou custos variáveis já considerados
                  na formação do preço.
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field
                    label="Deslocamento pontual"
                    value={travelCost}
                    onChange={setTravelCost}
                    placeholder="Ex.: 80,00"
                  />
                  <Field
                    label="Materiais exclusivos"
                    value={materialsCost}
                    onChange={setMaterialsCost}
                    placeholder="Ex.: 45,00"
                  />
                  <Field
                    label="Terceiros, taxas ou outros"
                    value={otherCost}
                    onChange={setOtherCost}
                    placeholder="Ex.: 30,00"
                  />
                  <Field
                    label="Preço personalizado (opcional)"
                    value={customPrice}
                    onChange={setCustomPrice}
                    placeholder="Vazio = preço recomendado"
                  />
                </div>
              </section>

              <section className="rounded-xl border border-white/5 bg-[#111827] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Package className="text-violet-400" size={20} />
                  <h2 className="font-semibold text-white">
                    Equipamentos considerados
                  </h2>
                </div>

                {!selectedService?.equipmentUsage?.length ? (
                  <p className="text-sm text-gray-500">
                    Este serviço não possui equipamentos associados.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedService.equipmentUsage.map((usage) => {
                      const item = equipmentList.find(
                        (equipment) => equipment.id === usage.equipmentId,
                      )

                      if (!item) {
                        return (
                          <div
                            key={usage.equipmentId}
                            className="rounded-lg bg-amber-500/5 p-3 text-sm text-amber-200"
                          >
                            Um equipamento associado não foi encontrado.
                          </div>
                        )
                      }

                      const hourlyCost = getEquipmentHourlyCost(item)

                      return (
                        <div
                          key={usage.equipmentId}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-800/60 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Boxes className="text-violet-300" size={19} />
                            <div>
                              <p className="text-sm font-medium text-white">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {usage.hours} h de uso
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">
                              {currency(hourlyCost * usage.hours)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Depreciação
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {equipmentWithoutHours.length > 0 && (
                  <p className="mt-3 text-xs text-amber-300">
                    Atenção: há equipamentos sem horas produtivas configuradas.
                    A depreciação desses itens não está sendo contabilizada.
                  </p>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-xl border border-white/5 bg-[#111827] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Calculator className="text-violet-400" size={20} />
                  <h2 className="font-semibold text-white">Memória de cálculo</h2>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Mão de obra</span>
                    <span className="text-white">
                      {currency(calculation.laborCost)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Custos fixos rateados</span>
                    <span className="text-white">
                      {currency(calculation.fixedCostAllocation)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Depreciação</span>
                    <span className="text-white">
                      {currency(equipmentDepreciation)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-400">Custos específicos</span>
                    <span className="text-white">
                      {currency(serviceSpecificCosts)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 border-t border-slate-700 pt-3">
                    <span className="font-semibold text-white">Custo total</span>
                    <span className="font-bold text-violet-200">
                      {currency(calculation.totalCost)}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <CircleDollarSign className="text-violet-300" size={20} />
                  <h2 className="font-semibold text-white">Resultado</h2>
                </div>

                {calculation.canCalculatePrice ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400">
                        Preço mínimo sustentável
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white">
                        {currency(calculation.minimumPrice ?? 0)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
                      <p className="text-xs text-violet-200">
                        Preço recomendado
                      </p>
                      <p className="mt-1 text-2xl font-bold text-violet-100">
                        {currency(calculation.suggestedPrice ?? 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Preço considerado no orçamento
                      </p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {appliedPrice === null
                          ? '—'
                          : currency(appliedPrice)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {customPrice.trim()
                          ? 'Valor personalizado'
                          : 'Preço recomendado automaticamente'}
                      </p>
                    </div>

                    <div className="border-t border-violet-500/20 pt-4">
                      <p className="text-xs text-gray-400">
                        Lucro estimado
                      </p>
                      <p className={`mt-1 text-xl font-bold ${
                        (estimatedProfit ?? 0) >= 0
                          ? 'text-emerald-300'
                          : 'text-red-300'
                      }`}>
                        {estimatedProfit === null
                          ? '—'
                          : currency(estimatedProfit)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Margem efetiva:{' '}
                        {effectiveMargin === null
                          ? '—'
                          : `${effectiveMargin.toFixed(2).replace('.', ',')}%`}
                      </p>
                    </div>

                    {appliedPrice !== null
                      && appliedPrice < (calculation.minimumPrice ?? 0) && (
                      <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-300">
                        O preço escolhido está abaixo do mínimo sustentável.
                      </p>                   )}
                  </div>
                ) : (
                  <p className="rounded-lg bg-slate-800 p-3 text-sm text-amber-200">
                    Não foi possível calcular os preços. Verifique as horas
                    das etapas e as configurações de remuneração, horas
                    produtivas, tributos e margem.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-white/5 bg-[#111827] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BriefcaseBusiness className="text-violet-400" size={19} />
                  <h2 className="font-semibold text-white">Dados do cliente</h2>
                </div>

                <form onSubmit={handleSaveBudget} className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-400">
                      Nome do cliente
                    </span>
                    <input
                      value={client}
                      onChange={(event) => setClient(event.target.value)}
                      placeholder="Nome ou empresa"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm text-gray-400">
                      Observações do orçamento
                    </span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={3}
                      placeholder="Detalhes, condições e escopo..."
                      className="w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-violet-500"
                    />
                  </label>

                  {error && (
                    <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                      {error}
                    </p>
                  )}

                  {success && (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                      {success}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !calculation.canCalculatePrice}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Save size={17} />
                    {saving ? 'Salvando...' : 'Salvar como rascunho'}
                  </button>

                  <button
                    type="button"
                    onClick={resetQuote}
                    className="w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-slate-800"
                  >
                    Limpar orçamento
                  </button>
                </form>
              </section>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#111827] p-4">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 shrink-0 text-gray-500" size={17} />
              <p className="text-xs leading-relaxed text-gray-500">
                Esta simulação utiliza as horas e os equipamentos definidos
                no cadastro do serviço. Os custos adicionais são específicos
                deste orçamento. Tributos e custos variáveis são aplicados
                sobre o preço de venda. Salvar como rascunho não registra
                receita nem significa que houve recebimento.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
