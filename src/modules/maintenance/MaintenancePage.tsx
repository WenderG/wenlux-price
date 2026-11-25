import { useEffect, useState, type FormEvent } from 'react'
import { db, type Equipment, type MaintenanceRecord, type MaintenanceStatus, type MaintenanceType } from '../../database/db'
import { Wrench, Plus, CalendarClock, CheckCircle2, AlertTriangle, Pencil, Trash2, X, History, CircleDollarSign } from 'lucide-react'

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const currency = (v:number) => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const dateLabel = (v?:string) => v ? new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR') : '—'
const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-violet-500'

export default function MaintenancePage() {
  const [records,setRecords] = useState<MaintenanceRecord[]>([])
  const [equipment,setEquipment] = useState<Equipment[]>([])
  const [showForm,setShowForm] = useState(false)
  const [editingId,setEditingId] = useState<number|null>(null)
  const [filter,setFilter] = useState<'all'|MaintenanceStatus>('all')
  const [equipmentFilter,setEquipmentFilter] = useState('all')
  const [equipmentId,setEquipmentId] = useState('')
  const [title,setTitle] = useState('')
  const [description,setDescription] = useState('')
  const [type,setType] = useState<MaintenanceType>('preventive')
  const [status,setStatus] = useState<MaintenanceStatus>('scheduled')
  const [scheduledDate,setScheduledDate] = useState(today())
  const [completedDate,setCompletedDate] = useState('')
  const [cost,setCost] = useState('0')
  const [notes,setNotes] = useState('')
  const [error,setError] = useState('')

  async function loadData(){const [items,history]=await Promise.all([db.equipment.orderBy('name').toArray(),db.maintenance.orderBy('scheduledDate').reverse().toArray()]);setEquipment(items);setRecords(history)}
  useEffect(()=>{let cancelled=false; const refresh=async()=>{const [items,history]=await Promise.all([db.equipment.orderBy('name').toArray(),db.maintenance.orderBy('scheduledDate').reverse().toArray()]);if(!cancelled){setEquipment(items);setRecords(history)}};void refresh();return()=>{cancelled=true}},[])
  const equipmentName=(id:number)=>equipment.find(e=>e.id===id)?.name??'Equipamento removido'
  const overdue=(r:MaintenanceRecord)=>r.status==='scheduled'&&r.scheduledDate<today()
  const filtered=records.filter(r=>(filter==='all'||r.status===filter)&&(equipmentFilter==='all'||String(r.equipmentId)===equipmentFilter))
  const totalSpent=records.filter(r=>r.status==='completed').reduce((s,r)=>s+r.cost,0)
  const pending=records.filter(r=>r.status==='scheduled').length
  const late=records.filter(overdue).length
  const done=records.filter(r=>r.status==='completed').length
  function reset(){setEditingId(null);setEquipmentId('');setTitle('');setDescription('');setType('preventive');setStatus('scheduled');setScheduledDate(today());setCompletedDate('');setCost('0');setNotes('');setError('');setShowForm(false)}
  function edit(r:MaintenanceRecord){setEditingId(r.id??null);setEquipmentId(String(r.equipmentId));setTitle(r.title);setDescription(r.description??'');setType(r.type);setStatus(r.status);setScheduledDate(r.scheduledDate);setCompletedDate(r.completedDate??'');setCost(String(r.cost));setNotes(r.notes??'');setError('');setShowForm(true)}
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');const value=Number(cost);if(!equipmentId)return setError('Selecione um equipamento.');if(!title.trim())return setError('Informe o serviço de manutenção.');if(!scheduledDate)return setError('Informe a data da manutenção.');if(!Number.isFinite(value)||value<0)return setError('Informe um custo válido.');if(status==='completed'&&!completedDate)return setError('Informe a data da conclusão.');const record:MaintenanceRecord={equipmentId:Number(equipmentId),title:title.trim(),description:description.trim(),type,status,scheduledDate,completedDate:status==='completed'?completedDate:undefined,cost:value,notes:notes.trim()};try{if(editingId!==null)await db.maintenance.update(editingId,record);else await db.maintenance.add(record);reset();await loadData()}catch{setError('Não foi possível salvar o registro.')}}
  async function complete(r:MaintenanceRecord){await db.maintenance.update(r.id!,{status:'completed',completedDate:today()});await loadData()}
  async function remove(r:MaintenanceRecord){if(!window.confirm(`Excluir o registro “${r.title}”?`))return;await db.maintenance.delete(r.id!);await loadData()}

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-white">Manutenção</h1><p className="mt-1 text-sm text-gray-400">Organize revisões, reparos e custos dos seus equipamentos.</p></div><button onClick={()=>showForm?reset():(setError(''),setShowForm(true))} className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-500">{showForm?<X size={18}/>:<Plus size={18}/>} {showForm?'Fechar formulário':'Registrar manutenção'}</button></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Pendentes" value={String(pending)} icon={<CalendarClock size={19}/>} color="text-amber-300"/><Metric title="Atrasadas" value={String(late)} icon={<AlertTriangle size={19}/>} color="text-red-300"/><Metric title="Concluídas" value={String(done)} icon={<CheckCircle2 size={19}/>} color="text-emerald-300"/><Metric title="Custos registrados" value={currency(totalSpent)} icon={<CircleDollarSign size={19}/>} color="text-violet-300"/></div>
    {showForm&&<form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="font-semibold text-white">{editingId!==null?'Editar manutenção':'Novo registro'}</h2>{equipment.length===0?<p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">Cadastre um equipamento no módulo Equipamentos antes de registrar manutenções.</p>:<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Equipamento"><select className={fieldClass} value={equipmentId} onChange={e=>setEquipmentId(e.target.value)}><option value="">Selecione…</option>{equipment.map(i=><option key={i.id} value={i.id}>{i.name} — {i.category}</option>)}</select></Field>
      <Field label="Título / serviço"><input className={fieldClass} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Revisão das hélices"/></Field>
      <Field label="Tipo"><select className={fieldClass} value={type} onChange={e=>setType(e.target.value as MaintenanceType)}><option value="preventive">Preventiva</option><option value="corrective">Corretiva</option></select></Field>
      <Field label="Status"><select className={fieldClass} value={status} onChange={e=>setStatus(e.target.value as MaintenanceStatus)}><option value="scheduled">Pendente / agendada</option><option value="completed">Concluída</option></select></Field>
      <Field label="Data programada"><input type="date" className={fieldClass} value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)}/></Field>
      {status==='completed'&&<Field label="Data de conclusão"><input type="date" className={fieldClass} value={completedDate} onChange={e=>setCompletedDate(e.target.value)}/></Field>}
      <Field label="Custo (R$)"><input type="number" min="0" step="0.01" className={fieldClass} value={cost} onChange={e=>setCost(e.target.value)}/></Field>
      <Field label="Descrição"><input className={fieldClass} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Detalhes do serviço"/></Field>
      <div className="md:col-span-2"><Field label="Observações"><textarea className={fieldClass} rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Peças trocadas, fornecedor, recomendações…"/></Field></div>
    </div>}{error&&<p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}<div className="flex flex-wrap gap-3"><button type="submit" disabled={equipment.length===0} className="rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white disabled:opacity-50 hover:bg-violet-500">{editingId!==null?'Salvar alterações':'Salvar registro'}</button><button type="button" onClick={reset} className="rounded-lg border border-slate-700 px-5 py-2.5 text-gray-300 hover:bg-slate-800">Cancelar</button></div></form>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-gray-300"><History size={18}/><h2 className="font-semibold">Histórico e agenda</h2></div><div className="flex flex-wrap gap-2"><select className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-gray-200" value={equipmentFilter} onChange={e=>setEquipmentFilter(e.target.value)}><option value="all">Todos os equipamentos</option>{equipment.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-gray-200" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="all">Todos os status</option><option value="scheduled">Pendentes</option><option value="completed">Concluídos</option></select></div></div>
    {filtered.length===0?<div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center"><Wrench className="mx-auto mb-3 text-gray-500" size={34}/><p className="font-medium text-white">Nenhuma manutenção registrada</p><p className="mt-1 text-sm text-gray-400">Cadastre uma manutenção preventiva ou corretiva para acompanhar seu histórico.</p></div>:<div className="space-y-3">{filtered.map(r=><article key={r.id} className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="flex items-start gap-3"><div className={`rounded-lg p-3 ${r.type==='preventive'?'bg-blue-500/10 text-blue-300':'bg-orange-500/10 text-orange-300'}`}><Wrench size={20}/></div><div><h3 className="font-semibold text-white">{r.title}</h3><p className="text-sm text-gray-400">{equipmentName(r.equipmentId)} · {r.type==='preventive'?'Preventiva':'Corretiva'}</p><div className="mt-2 flex flex-wrap gap-2"><Badge label={r.status==='completed'?'Concluída':'Pendente'} tone={r.status==='completed'?'green':'amber'}/>{overdue(r)&&<Badge label="Atrasada" tone="red"/>}</div></div></div><div className="flex gap-1 self-end sm:self-start"><button title="Editar" onClick={()=>edit(r)} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><Pencil size={17}/></button>{r.status==='scheduled'&&<button title="Marcar como concluída" onClick={()=>void complete(r)} className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10"><CheckCircle2 size={17}/></button>}<button title="Excluir" onClick={()=>void remove(r)} className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={17}/></button></div></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><Info label="Data programada" value={dateLabel(r.scheduledDate)}/>{r.completedDate&&<Info label="Concluída em" value={dateLabel(r.completedDate)}/>}<Info label="Custo" value={currency(r.cost)}/></div>{r.description&&<p className="mt-3 text-sm text-gray-400">{r.description}</p>}{r.notes&&<p className="mt-3 border-t border-slate-800 pt-3 text-sm text-gray-500">{r.notes}</p>}</article>)}</div>}
  </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div><label className="mb-1 block text-sm text-gray-300">{label}</label>{children}</div>}
function Metric({title,value,icon,color}:{title:string;value:string;icon:React.ReactNode;color:string}){return <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-sm text-gray-400">{title}</span><span className={color}>{icon}</span></div><p className="text-xl font-bold text-white">{value}</p></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-lg bg-slate-800/70 p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-sm font-medium text-gray-200">{value}</p></div>}
function Badge({label,tone}:{label:string;tone:'green'|'amber'|'red'}){const colors={green:'bg-emerald-500/10 text-emerald-300',amber:'bg-amber-500/10 text-amber-300',red:'bg-red-500/10 text-red-300'};return <span className={`rounded-full px-2.5 py-1 text-xs ${colors[tone]}`}>{label}</span>}
