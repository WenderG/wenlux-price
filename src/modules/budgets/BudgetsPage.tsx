import { useEffect, useMemo, useState } from 'react'
import { db, type Budget } from '../../database/db'
import { FileText, Search, Send, Clock3, Trash2, CircleDollarSign, CalendarDays, BriefcaseBusiness } from 'lucide-react'

const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateLabel = (value: string) => {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR')
}
const statuses: Record<Budget['status'], { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'border-slate-600 bg-slate-700/30 text-slate-300' },
  sent: { label: 'Enviado', color: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  approved: { label: 'Aprovado', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  rejected: { label: 'Recusado', color: 'border-red-500/30 bg-red-500/10 text-red-300' },
}
const inputClass = 'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-violet-500'

export default function BudgetsPage() {
  const [items, setItems] = useState<Budget[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Budget['status']>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try { setItems(await db.budgets.orderBy('date').reverse().toArray()); setError('') }
    catch { setError('Não foi possível carregar os orçamentos.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    return items.filter(item => {
      const matchesQuery = !normalized || item.client.toLocaleLowerCase('pt-BR').includes(normalized) || item.description.toLocaleLowerCase('pt-BR').includes(normalized)
      return matchesQuery && (statusFilter === 'all' || item.status === statusFilter)
    })
  }, [items, query, statusFilter])
  const counts = useMemo(() => ({
    total: items.length,
    drafts: items.filter(item => item.status === 'draft').length,
    sent: items.filter(item => item.status === 'sent').length,
    approved: items.filter(item => item.status === 'approved').length,
    approvedValue: items.filter(item => item.status === 'approved').reduce((sum, item) => sum + item.suggestedPrice, 0),
  }), [items])

  async function updateStatus(item: Budget, status: Budget['status']) {
    if (item.id === undefined) return
    try { await db.budgets.update(item.id, { status }); await load() }
    catch { setError('Não foi possível atualizar o status do orçamento.') }
  }
  async function remove(item: Budget) {
    if (item.id === undefined || !window.confirm(`Excluir o orçamento de ${item.client}?`)) return
    try { await db.budgets.delete(item.id); await load() }
    catch { setError('Não foi possível excluir o orçamento.') }
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-white">Orçamentos</h1><p className="mt-1 text-sm text-gray-400">Acompanhe propostas comerciais e o andamento das negociações.</p></div><button onClick={() => window.dispatchEvent(new CustomEvent('wenlux:navigate', { detail: 'Precificação' }))} className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-500"><BriefcaseBusiness size={18}/> Criar orçamento na Precificação</button></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Orçamentos" value={String(counts.total)} icon={<FileText size={19}/>} color="text-violet-300"/><Metric title="Em rascunho" value={String(counts.drafts)} icon={<Clock3 size={19}/>} color="text-slate-300"/><Metric title="Enviados" value={String(counts.sent)} icon={<Send size={19}/>} color="text-blue-300"/><Metric title="Aprovados" value={currency(counts.approvedValue)} icon={<CircleDollarSign size={19}/>} color="text-emerald-300" subtitle={`${counts.approved} proposta(s) aprovada(s)`}/></div>
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={17}/><input className={`${inputClass} w-full pl-9`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente ou descrição..."/></div><select className={inputClass} value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}><option value="all">Todos os status</option><option value="draft">Rascunhos</option><option value="sent">Enviados</option><option value="approved">Aprovados</option><option value="rejected">Recusados</option></select></div>
    {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    {loading ? <div className="rounded-xl border border-white/5 bg-[#111827] p-8 text-center text-gray-400">Carregando orçamentos...</div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center"><FileText className="mx-auto mb-3 text-gray-500" size={36}/><p className="font-medium text-white">Nenhum orçamento encontrado</p><p className="mt-1 text-sm text-gray-400">Os orçamentos gerados na Precificação aparecerão aqui.</p></div> : <div className="space-y-3">{filtered.map(item => <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-white">{item.client}</h2><span className={`rounded-full border px-2.5 py-1 text-xs ${statuses[item.status].color}`}>{statuses[item.status].label}</span></div><p className="mt-2 break-words text-sm text-gray-300">{item.description || 'Sem descrição'}</p><div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500"><span className="flex items-center gap-1.5"><CalendarDays size={14}/>{dateLabel(item.date)}</span><span>Custo estimado: {currency(item.estimatedCost)}</span></div></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end"><div className="sm:mr-3"><p className="text-xs text-gray-500">Valor proposto</p><p className="text-xl font-bold text-white">{currency(item.suggestedPrice)}</p></div><select aria-label={`Status do orçamento de ${item.client}`} className={inputClass} value={item.status} onChange={e=>void updateStatus(item,e.target.value as Budget['status'])}><option value="draft">Rascunho</option><option value="sent">Enviado</option><option value="approved">Aprovado</option><option value="rejected">Recusado</option></select><button title="Excluir orçamento" onClick={()=>void remove(item)} className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={17}/></button></div></div></article>)}</div>}
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80"><strong className="text-amber-200">Importante:</strong> marcar um orçamento como aprovado não registra recebimento nem gera receita no caixa. O acompanhamento financeiro de pagamentos será tratado no módulo financeiro.</div>
  </div>
}
function Metric({title,value,icon,color,subtitle}:{title:string;value:string;icon:React.ReactNode;color:string;subtitle?:string}){return <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm text-gray-400">{title}</span><span className={color}>{icon}</span></div><p className="text-xl font-bold text-white">{value}</p>{subtitle&&<p className="mt-1 text-xs text-gray-500">{subtitle}</p>}</div>}
