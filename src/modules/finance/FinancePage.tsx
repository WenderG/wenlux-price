import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { db, type Budget, type Transaction } from '../../database/db'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, CircleDollarSign, History, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateLabel = (value: string) => {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR')
}
const field = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-violet-500'
const incomeCategories = ['Recebimento de serviço', 'Adiantamento', 'Reembolso', 'Venda de equipamento', 'Outras entradas']
const expenseCategories = ['Pagamento operacional', 'Compra de material', 'Transporte', 'Manutenção', 'Taxas e impostos', 'Outras saídas']

export default function FinancePage() {
  const [items, setItems] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [month, setMonth] = useState(today().slice(0, 7))
  const [typeFilter, setTypeFilter] = useState<'all' | Transaction['type']>('all')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<Transaction['type']>('income')
  const [category, setCategory] = useState(incomeCategories[0])
  const [date, setDate] = useState(today())
  const [budgetId, setBudgetId] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [transactions, budgetList] = await Promise.all([
      db.transactions.orderBy('date').reverse().toArray(),
      db.budgets.orderBy('date').reverse().toArray(),
    ])
    setItems(transactions)
    setBudgets(budgetList)
  }
  useEffect(() => { void load() }, [])

  const monthItems = useMemo(() => items.filter(item => item.date.startsWith(month)), [items, month])
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pt-BR')
    return monthItems.filter(item => (typeFilter === 'all' || item.type === typeFilter) && (!q || item.description.toLocaleLowerCase('pt-BR').includes(q) || item.category.toLocaleLowerCase('pt-BR').includes(q)))
  }, [monthItems, typeFilter, query])
  const income = monthItems.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const outgoing = monthItems.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const balance = income - outgoing

  function reset() {
    setEditingId(null); setDescription(''); setAmount(''); setType('income'); setCategory(incomeCategories[0]); setDate(today()); setBudgetId(''); setError(''); setShowForm(false)
  }
  function edit(item: Transaction) {
    setEditingId(item.id ?? null); setDescription(item.description); setAmount(String(item.amount)); setType(item.type); setCategory(item.category); setDate(item.date); setBudgetId(item.budgetId ? String(item.budgetId) : ''); setError(''); setShowForm(true)
  }
  function changeType(next: Transaction['type']) {
    setType(next); setCategory(next === 'income' ? incomeCategories[0] : expenseCategories[0]); if (next === 'expense') setBudgetId('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    const value = Number(amount.replace(',', '.'))
    if (!description.trim()) return setError('Informe a descrição da movimentação.')
    if (!Number.isFinite(value) || value <= 0) return setError('Informe um valor maior que zero.')
    if (!date) return setError('Informe a data da movimentação.')
    const record: Transaction = { description: description.trim(), amount: value, type, category, date, ...(type === 'income' && budgetId ? { budgetId: Number(budgetId) } : {}) }
    try {
      if (editingId !== null) await db.transactions.update(editingId, record)
      else await db.transactions.add(record)
      reset(); await load()
    } catch { setError('Não foi possível salvar a movimentação.') }
  }
  async function remove(item: Transaction) {
    if (item.id === undefined || !window.confirm(`Excluir a movimentação “${item.description}”?`)) return
    try { await db.transactions.delete(item.id); await load() } catch { setError('Não foi possível excluir a movimentação.') }
  }
  const linkedBudget = (id?: number) => budgets.find(b => b.id === id)
  const selectedBudget = budgets.find(b => b.id === Number(budgetId))

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h1 className="text-2xl font-bold text-white">Movimentações financeiras</h1><p className="mt-1 text-sm text-gray-400">Registre entradas e saídas de dinheiro efetivamente movimentado.</p></div>
      <button onClick={() => showForm ? reset() : (setError(''), setShowForm(true))} className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-500">{showForm ? <X size={18}/> : <Plus size={18}/>} {showForm ? 'Fechar formulário' : 'Registrar movimentação'}</button>
    </div>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"><CalendarDays size={18} className="text-violet-300"/><label className="text-sm text-gray-300">Mês de referência</label><input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"/></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Metric title="Entradas registradas" value={currency(income)} icon={<ArrowDownLeft size={19}/>} color="text-emerald-300"/>
      <Metric title="Saídas registradas" value={currency(outgoing)} icon={<ArrowUpRight size={19}/>} color="text-rose-300"/>
      <Metric title="Saldo do período" value={currency(balance)} icon={<CircleDollarSign size={19}/>} color={balance >= 0 ? 'text-violet-300' : 'text-rose-300'}/>
    </div>
    {showForm && <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5">
      <h2 className="font-semibold text-white">{editingId !== null ? 'Editar movimentação' : 'Novo registro'}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Tipo de movimentação"><select className={field} value={type} onChange={e=>changeType(e.target.value as Transaction['type'])}><option value="income">Entrada (recebimento)</option><option value="expense">Saída (pagamento)</option></select></Field>
        <Field label="Descrição"><input className={field} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex.: Sinal recebido do cliente"/></Field>
        <Field label="Valor (R$)"><input className={field} type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></Field>
        <Field label="Categoria"><select className={field} value={category} onChange={e=>setCategory(e.target.value)}>{(type === 'income' ? incomeCategories : expenseCategories).map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Data"><input className={field} type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
        {type === 'income' && <Field label="Vincular orçamento (opcional)"><select className={field} value={budgetId} onChange={e=>setBudgetId(e.target.value)}><option value="">Nenhum orçamento</option>{budgets.filter(b=>b.status==='approved').map(b=><option key={b.id} value={b.id}>{b.client} — {b.description} ({currency(b.suggestedPrice)})</option>)}</select></Field>}
      </div>
      {selectedBudget && <p className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-violet-200">Orçamento vinculado: {selectedBudget.client}. Você pode registrar pagamentos parciais em movimentações separadas.</p>}
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="submit" className="rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-500">{editingId !== null ? 'Salvar alterações' : 'Salvar movimentação'}</button><button type="button" onClick={reset} className="rounded-lg border border-slate-700 px-5 py-2.5 text-gray-300 hover:bg-slate-800">Cancelar</button></div>
    </form>}
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-white">Histórico do período</h2><p className="text-sm text-gray-500">{filtered.length} movimentação(ões)</p></div><div className="flex flex-wrap gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={17}/><input className={`${field} min-w-48 pl-9`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar descrição ou categoria"/></div><select className={field} value={typeFilter} onChange={e=>setTypeFilter(e.target.value as typeof typeFilter)}><option value="all">Entradas e saídas</option><option value="income">Somente entradas</option><option value="expense">Somente saídas</option></select></div></div>
    {filtered.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center"><History className="mx-auto mb-3 text-gray-500" size={36}/><p className="font-medium text-white">Nenhuma movimentação neste período</p><p className="mt-1 text-sm text-gray-400">Registre os recebimentos e pagamentos para acompanhar o caixa.</p></div> : <div className="space-y-3">{filtered.map(item=>{const budget=linkedBudget(item.budgetId);return <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><div className={`rounded-lg p-3 ${item.type==='income'?'bg-emerald-500/10 text-emerald-300':'bg-rose-500/10 text-rose-300'}`}>{item.type==='income'?<ArrowDownLeft size={20}/>:<ArrowUpRight size={20}/>}</div><div><h3 className="font-medium text-white">{item.description}</h3><p className="mt-1 text-sm text-gray-400">{item.category} · {dateLabel(item.date)} · {item.type==='income'?'Entrada':'Saída'}</p>{budget&&<p className="mt-1 text-xs text-violet-300">Orçamento: {budget.client} — {budget.description}</p>}</div></div><div className="flex items-center justify-between sm:justify-end sm:gap-4"><p className={`text-lg font-semibold ${item.type==='income'?'text-emerald-300':'text-rose-300'}`}>{item.type==='income'?'+':'−'} {currency(item.amount)}</p><div className="flex gap-1"><button title="Editar" onClick={()=>edit(item)} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><Pencil size={17}/></button><button title="Excluir" onClick={()=>void remove(item)} className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={17}/></button></div></div></div></article>})}</div>}
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80"><strong className="text-amber-200">Importante para não duplicar:</strong> este histórico registra movimentações de caixa. O módulo Despesas continua sendo o cadastro dos custos operacionais. Se registrar uma saída aqui e também em Despesas, não some os dois registros como se fossem gastos distintos. Orçamentos aprovados não geram entrada automaticamente; os recebimentos devem ser registrados aqui, inclusive pagamentos parciais.</div>
  </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div><label className="mb-1 block text-sm text-gray-300">{label}</label>{children}</div>}
function Metric({title,value,icon,color}:{title:string;value:string;icon:React.ReactNode;color:string}){return <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm text-gray-400">{title}</span><span className={color}>{icon}</span></div><p className="text-xl font-bold text-white">{value}</p></div>}
