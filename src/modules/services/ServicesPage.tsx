
import { useEffect, useState, type FormEvent } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  BriefcaseBusiness,
  Clock,
  Package,
  Calculator,
  X,
} from 'lucide-react'

import {
  db,
  type Service,
  type Equipment,
  type EquipmentUsage,
} from '../../database/db'

function currency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function getEquipmentHourlyCost(item: Equipment) {
  const hours = item.productiveHoursPerMonth ?? 0

  if (
    hours <= 0 ||
    item.usefulLifeMonths <= 0
  ) {
    return 0
  }

  const monthlyDepreciation =
    (item.purchaseValue - item.residualValue) /
    item.usefulLifeMonths

  return monthlyDepreciation / hours
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

    if (!item) return total

    return total + getEquipmentHourlyCost(item) * used.hours
  }, 0)
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Audiovisual')
  const [estimatedHours, setEstimatedHours] = useState('1')
  const [hourlyRate, setHourlyRate] = useState('0')
  const [equipmentUsage, setEquipmentUsage] = useState<
    Record<number, string>
  >({})
  const [error, setError] = useState('')

  async function loadData() {
    const [serviceRecords, equipmentRecords] = await Promise.all([
      db.services.orderBy('name').toArray(),
      db.equipment.orderBy('name').toArray(),
    ])

    setServices(serviceRecords)
    setEquipmentList(equipmentRecords)
  }

  useEffect(() => {
    loadData()
  }, [])

  function resetForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setCategory('Audiovisual')
    setEstimatedHours('1')
    setHourlyRate('0')
    setEquipmentUsage({})
    setError('')
    setShowForm(false)
  }

  function handleEdit(service: Service) {
    setEditingId(service.id!)
    setName(service.name)
    setDescription(service.description ?? '')
    setCategory(service.category)
    setEstimatedHours(String(service.estimatedHours))
    setHourlyRate(String(service.hourlyRate))

    const usage: Record<number, string> = {}

    service.equipmentUsage?.forEach((item) => {
      usage[item.equipmentId] = String(item.hours)
    })

    setEquipmentUsage(usage)
    setError('')
    setShowForm(true)
  }

  function handleEquipmentChange(
    equipmentId: number,
    value: string,
  ) {
    setEquipmentUsage((current) => {
      const updated = { ...current }

      if (value === '') {
        delete updated[equipmentId]
      } else {
        updated[equipmentId] = value
      }

      return updated
    })
  }

  const selectedUsage: EquipmentUsage[] = Object.entries(
    equipmentUsage,
  )
    .filter(([, hours]) => Number(hours) > 0)
    .map(([id, hours]) => ({
      equipmentId: Number(id),
      hours: Number(hours),
    }))

  const equipmentCost = calculateEquipmentCost(
    selectedUsage,
    equipmentList,
  )

  const laborCost =
    Number(estimatedHours) * Number(hourlyRate)

  const estimatedCost = laborCost + equipmentCost

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const hours = Number(estimatedHours)
    const rate = Number(hourlyRate)

    if (!name.trim()) {
      setError('Informe o nome do serviço.')
      return
    }

    if (!Number.isFinite(hours) || hours <= 0) {
      setError('Informe uma duração válida para o serviço.')
      return
    }

    if (!Number.isFinite(rate) || rate < 0) {
      setError('Informe um valor válido para a mão de obra por hora.')
      return
    }

    const invalidUsage = Object.values(equipmentUsage).some(
      (value) => !Number.isFinite(Number(value)) || Number(value) <= 0,
    )

    if (invalidUsage) {
      setError('Confira as horas de utilização dos equipamentos.')
      return
    }

    const serviceData: Service = {
      name: name.trim(),
      description: description.trim(),
      category,
      estimatedHours: hours,
      hourlyRate: rate,
      equipmentUsage: selectedUsage,
    }

    try {
      if (editingId !== null) {
        await db.services.update(editingId, serviceData)
      } else {
        await db.services.add(serviceData)
      }

      resetForm()
      await loadData()
    } catch {
      setError('Não foi possível salvar o serviço.')
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este serviço?',
    )

    if (!confirmed) return

    await db.services.delete(id)
    await loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Serviços</h1>
          <p className="mt-1 text-sm text-gray-400">
            Cadastre seus serviços e estime os custos de execução.
          </p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              resetForm()
            } else {
              setEditingId(null)
              setError('')
              setShowForm(true)
            }
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-cyan-400"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Fechar formulário' : 'Novo serviço'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-slate-700 bg-slate-900 p-5"
        >
          <h2 className="text-lg font-semibold text-white">
            {editingId !== null ? 'Editar serviço' : 'Cadastrar serviço'}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Nome do serviço
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Filmagem aérea de imóvel"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                <option>Audiovisual</option>
                <option>Filmagem com drone</option>
                <option>Inspeção</option>
                <option>Desenvolvimento web</option>
                <option>Manutenção</option>
                <option>Consultoria</option>
                <option>Outro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Duração estimada (horas)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Mão de obra por hora (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="Ex.: 50"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Quanto vale cada hora de trabalho dedicada ao serviço?
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-gray-300">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Descreva o que está incluído no serviço..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <Package className="text-cyan-400" size={19} />
              <h3 className="font-semibold text-white">
                Equipamentos utilizados
              </h3>
            </div>

            {equipmentList.length === 0 ? (
              <p className="rounded-lg bg-slate-800 p-4 text-sm text-gray-400">
                Você ainda não cadastrou equipamentos. Cadastre-os na seção
                Equipamentos para utilizá-los nos serviços.
              </p>
            ) : (
              <div className="space-y-3">
                {equipmentList.map((item) => {
                  const selected = equipmentUsage[item.id!] !== undefined

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 items-center gap-3 rounded-lg bg-slate-800 p-3 sm:grid-cols-[1fr_150px]"
                    >
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) =>
                            handleEquipmentChange(
                              item.id!,
                              e.target.checked ? '1' : '',
                            )
                          }
                          className="h-4 w-4 accent-cyan-500"
                        />

                        <span>
                          <span className="block text-sm font-medium text-white">
                            {item.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {item.category} · {currency(getEquipmentHourlyCost(item))}/h
                          </span>
                        </span>
                      </label>

                      {selected && (
                        <div>
                          <label className="mb-1 block text-xs text-gray-400">
                            Horas de utilização
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={equipmentUsage[item.id!] ?? ''}
                            onChange={(e) =>
                              handleEquipmentChange(item.id!, e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Calculator size={18} className="text-cyan-400" />
              <h3 className="font-semibold text-white">
                Prévia dos custos
              </h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-400">
                  Mão de obra ({Number(estimatedHours) || 0} h)
                </span>
                <span className="text-white">
                  {currency(Number.isFinite(laborCost) ? laborCost : 0)}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-400">
                  Depreciação dos equipamentos
                </span>
                <span className="text-white">
                  {currency(equipmentCost)}
                </span>
              </div>

              <div className="flex justify-between gap-3 border-t border-slate-700 pt-3">
                <span className="font-semibold text-white">
                  Custo estimado parcial
                </span>
                <span className="font-bold text-cyan-300">
                  {currency(
                    Number.isFinite(estimatedCost) ? estimatedCost : 0,
                  )}
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Este valor ainda não inclui despesas fixas, custos variáveis,
              tributos ou margem de lucro.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-5 py-2.5 font-medium text-slate-950 transition hover:bg-cyan-400"
            >
              {editingId !== null ? 'Salvar alterações' : 'Cadastrar serviço'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-gray-300 transition hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
          <BriefcaseBusiness
            className="mx-auto mb-3 text-gray-500"
            size={36}
          />
          <p className="font-medium text-white">
            Nenhum serviço cadastrado
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Cadastre seus serviços para começar a estimar os custos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {services.map((service) => {
            const cost = calculateEquipmentCost(
              service.equipmentUsage,
              equipmentList,
            )

            const labor =
              service.estimatedHours * service.hourlyRate

            return (
              <div
                key={service.id}
                className="rounded-xl border border-slate-700 bg-slate-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-cyan-500/10 p-3 text-cyan-400">
                      <BriefcaseBusiness size={22} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-white">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {service.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(service)}
                      title="Editar serviço"
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-cyan-500/10 hover:text-cyan-400"
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      onClick={() => service.id && handleDelete(service.id)}
                      title="Excluir serviço"
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {service.description && (
                  <p className="mt-4 text-sm text-gray-400">
                    {service.description}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">
                      Duração estimada
                    </p>
                    <p className="mt-1 flex items-center gap-2 font-medium text-white">
                      <Clock size={15} className="text-gray-400" />
                      {service.estimatedHours} horas
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Mão de obra
                    </p>
                    <p className="mt-1 font-medium text-white">
                      {currency(labor)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Depreciação dos equipamentos
                    </p>
                    <p className="mt-1 font-medium text-white">
                      {currency(cost)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Custo estimado parcial
                    </p>
                    <p className="mt-1 font-semibold text-cyan-300">
                      {currency(labor + cost)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-800 pt-3">
                  <p className="mb-2 text-xs text-gray-500">
                    Equipamentos selecionados
                  </p>

                  {service.equipmentUsage?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {service.equipmentUsage.map((used) => {
                        const item = equipmentList.find(
                          (equipment) =>
                            equipment.id === used.equipmentId,
                        )

                        return (
                          <span
                            key={used.equipmentId}
                            className="rounded-md bg-slate-800 px-2 py-1 text-xs text-gray-300"
                          >
                            {item?.name ?? 'Equipamento indisponível'} · {used.hours} h
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Nenhum equipamento associado.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
