
import { useEffect, useState, type FormEvent } from 'react'
import { db, type Equipment } from '../../database/db'
import {
  Plus,
  Trash2,
  Package,
  Clock,
  Calculator,
  Pencil,
  X,
} from 'lucide-react'

function currency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function getLocalDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDepreciation(item: Equipment) {
  const monthlyDepreciation =
    (item.purchaseValue - item.residualValue) /
    item.usefulLifeMonths

  const purchaseDate = new Date(`${item.purchaseDate}T00:00:00`)
  const today = new Date()

  let elapsedMonths =
    (today.getFullYear() - purchaseDate.getFullYear()) * 12 +
    today.getMonth() - purchaseDate.getMonth()

  if (today.getDate() < purchaseDate.getDate()) {
    elapsedMonths--
  }

  elapsedMonths = Math.max(0, elapsedMonths)

  const totalDepreciation = Math.min(
    monthlyDepreciation * elapsedMonths,
    item.purchaseValue - item.residualValue,
  )

  const currentValue = Math.max(
    item.residualValue,
    item.purchaseValue - totalDepreciation,
  )

  const hours = item.productiveHoursPerMonth ?? 0

  const depreciationPerHour =
    hours > 0 ? monthlyDepreciation / hours : null

  return {
    monthlyDepreciation,
    currentValue,
    depreciationPerHour,
  }
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('Drone')
  const [purchaseValue, setPurchaseValue] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(getLocalDate())
  const [usefulLifeMonths, setUsefulLifeMonths] = useState('36')
  const [residualValue, setResidualValue] = useState('0')
  const [productiveHoursPerMonth, setProductiveHoursPerMonth] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  async function loadEquipment() {
    const records = await db.equipment.orderBy('name').toArray()
    setEquipment(records)
  }

  useEffect(() => {
    loadEquipment()
  }, [])

  function resetForm() {
    setEditingId(null)
    setName('')
    setCategory('Drone')
    setPurchaseValue('')
    setPurchaseDate(getLocalDate())
    setUsefulLifeMonths('36')
    setResidualValue('0')
    setProductiveHoursPerMonth('')
    setNotes('')
    setError('')
    setShowForm(false)
  }

  function handleEdit(item: Equipment) {
    setEditingId(item.id!)
    setName(item.name)
    setCategory(item.category)
    setPurchaseValue(String(item.purchaseValue))
    setPurchaseDate(item.purchaseDate)
    setUsefulLifeMonths(String(item.usefulLifeMonths))
    setResidualValue(String(item.residualValue))
    setProductiveHoursPerMonth(
      item.productiveHoursPerMonth
        ? String(item.productiveHoursPerMonth)
        : '',
    )
    setNotes(item.notes ?? '')
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const purchase = Number(purchaseValue)
    const residual = Number(residualValue)
    const usefulLife = Number(usefulLifeMonths)
    const productiveHours = Number(productiveHoursPerMonth)

    if (!name.trim()) {
      setError('Informe o nome do equipamento.')
      return
    }

    if (!purchaseDate) {
      setError('Informe a data de aquisição.')
      return
    }

    const selectedDate = new Date(`${purchaseDate}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate > today) {
      setError('A data de aquisição não pode ser futura.')
      return
    }

    if (!Number.isFinite(purchase) || purchase <= 0) {
      setError('Informe um valor de aquisição válido.')
      return
    }

    if (
      !Number.isFinite(residual) ||
      residual < 0 ||
      residual >= purchase
    ) {
      setError('O valor residual deve ser menor que o valor de aquisição.')
      return
    }

    if (!Number.isInteger(usefulLife) || usefulLife <= 0) {
      setError('A vida útil deve ser um número inteiro maior que zero.')
      return
    }

    if (
      !Number.isFinite(productiveHours) ||
      productiveHours <= 0
    ) {
      setError('Informe as horas produtivas por mês.')
      return
    }

    const updatedEquipment: Equipment = {
      name: name.trim(),
      category,
      purchaseValue: purchase,
      purchaseDate,
      usefulLifeMonths: usefulLife,
      residualValue: residual,
      productiveHoursPerMonth: productiveHours,
      notes: notes.trim(),
    }

    try {
      if (editingId !== null) {
        await db.equipment.update(editingId, updatedEquipment)
      } else {
        await db.equipment.add(updatedEquipment)
      }

      resetForm()
      await loadEquipment()
    } catch {
      setError('Não foi possível salvar o equipamento.')
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este equipamento?',
    )

    if (!confirmed) return

    await db.equipment.delete(id)
    await loadEquipment()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipamentos</h1>
          <p className="mt-1 text-sm text-gray-400">
            Gerencie seus ativos, utilização e depreciação.
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
          {showForm ? 'Fechar formulário' : 'Novo equipamento'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-slate-700 bg-slate-900 p-5"
        >
          <h2 className="text-lg font-semibold text-white">
            {editingId !== null ? 'Editar equipamento' : 'Cadastrar equipamento'}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Nome do equipamento
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: DJI Lito 1"
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
                <option>Drone</option>
                <option>Bateria</option>
                <option>Controle</option>
                <option>Câmera</option>
                <option>Computador</option>
                <option>Acessório</option>
                <option>Outro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Valor de aquisição (R$)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={purchaseValue}
                onChange={(e) => setPurchaseValue(e.target.value)}
                placeholder="Ex.: 3500"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Data de aquisição
              </label>
              <input
                type="date"
                value={purchaseDate}
                max={getLocalDate()}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Vida útil estimada (meses)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={usefulLifeMonths}
                onChange={(e) => setUsefulLifeMonths(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Valor residual (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={residualValue}
                onChange={(e) => setResidualValue(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Horas produtivas por mês
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={productiveHoursPerMonth}
                onChange={(e) => setProductiveHoursPerMonth(e.target.value)}
                placeholder="Ex.: 10"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Quantas horas por mês o equipamento será usado em serviços?
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Observações
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-cyan-500"
              />
            </div>
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
              {editingId !== null ? 'Salvar alterações' : 'Cadastrar equipamento'}
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

      {equipment.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
          <Package className="mx-auto mb-3 text-gray-500" size={36} />
          <p className="font-medium text-white">
            Nenhum equipamento cadastrado
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Cadastre seus equipamentos para acompanhar os custos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {equipment.map((item) => {
            const depreciation = getDepreciation(item)

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-700 bg-slate-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-cyan-500/10 p-3 text-cyan-400">
                      <Package size={22} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{item.name}</h3>
                      <p className="text-sm text-gray-400">{item.category}</p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(item)}
                      title="Editar equipamento"
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-cyan-500/10 hover:text-cyan-400"
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      onClick={() => item.id && handleDelete(item.id)}
                      title="Excluir equipamento"
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Valor de aquisição</p>
                    <p className="mt-1 font-medium text-white">
                      {currency(item.purchaseValue)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Valor atual estimado</p>
                    <p className="mt-1 font-medium text-white">
                      {currency(depreciation.currentValue)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Depreciação mensal</p>
                    <p className="mt-1 font-medium text-white">
                      {currency(depreciation.monthlyDepreciation)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Vida útil</p>
                    <p className="mt-1 font-medium text-white">
                      {item.usefulLifeMonths} meses
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-800 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                      <Clock size={14} />
                      Uso mensal
                    </div>
                    <p className="font-semibold text-white">
                      {item.productiveHoursPerMonth
                        ? `${item.productiveHoursPerMonth} h`
                        : 'Não informado'}
                    </p>
                  </div>

                  <div className="rounded-lg bg-cyan-500/10 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-cyan-300">
                      <Calculator size={14} />
                      Depreciação por hora
                    </div>
                    <p className="font-semibold text-cyan-300">
                      {depreciation.depreciationPerHour !== null
                        ? currency(depreciation.depreciationPerHour)
                        : 'Não calculada'}
                    </p>
                  </div>
                </div>

                {item.notes && (
                  <p className="mt-4 border-t border-slate-800 pt-3 text-sm text-gray-400">
                    {item.notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
