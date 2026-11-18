'use client'

import useSWR from 'swr'
import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Check, ClipboardList, Copy, LockKeyhole, PartyPopper, Plus, RotateCcw, Sandwich, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Order = { id: string; name: string; quantity: number; createdAt: string; paidAt: string | null }
type Settings = { alias: string; price: number | null; aliasUpdatedAt: string | null }
const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((response) => response.json())
const pesos = (valor: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor)
// Fijo a Argentina para que todos vean la misma fecha, sin importar el navegador.
const fechaHora = (valor: string) => new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(valor))

export default function Page() {
  const { data: orders = [], mutate, isLoading } = useSWR<Order[]>('/api/orders', fetcher, { refreshInterval: 5000 })
  const { data: settings, mutate: mutateSettings } = useSWR<Settings>('/api/settings', fetcher, { refreshInterval: 30000 })
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearSettings, setClearSettings] = useState(true)
  const [copied, setCopied] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)

  async function addOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSaving(true)
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, quantity }) })
    setIsSaving(false)
    if (!response.ok) { setMessage('Revisá el nombre y la cantidad.'); return }
    setName(''); setQuantity('1'); setMessage('¡Anotado!')
    await mutate()
  }

  async function removeOrder(order: Order) {
    if (!window.confirm(`¿Dar de baja a ${order.name}?`)) return
    setMessage('')
    setRemovingId(order.id)
    const response = await fetch(`/api/orders/${order.id}`, { method: 'DELETE' })
    setRemovingId(null)
    if (!response.ok) {
      // 404 = alguien lo borro mientras tanto; refrescamos para no mostrar algo que no esta.
      setMessage(response.status === 404 ? 'Ese pedido ya no estaba.' : 'No se pudo dar de baja.')
      await mutate()
      return
    }
    setMessage(`${order.name} se dio de baja.`)
    await mutate()
  }

  async function togglePaid(order: Order) {
    const paid = !order.paidAt
    // Desmarcar es raro y puede ser un toque sin querer: se pregunta.
    if (!paid && !window.confirm(`¿Desmarcar el pago de ${order.name}?`)) return
    setMessage('')
    setPayingId(order.id)
    const response = await fetch(`/api/orders/${order.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid }) })
    setPayingId(null)
    if (!response.ok) {
      setMessage(response.status === 404 ? 'Ese pedido ya no estaba.' : 'No se pudo guardar el pago.')
      await mutate()
      return
    }
    setMessage(paid ? `${order.name} marcó que pagó.` : `Se desmarcó el pago de ${order.name}.`)
    await mutate()
  }

  function askClear() {
    if (!orders.length && !hasSettings) return
    // Cada vez que se abre arranca tildado: lo normal es empezar de cero.
    setClearSettings(true)
    setConfirmClear(true)
  }

  async function clearOrders() {
    const conAjustes = clearSettings && hasSettings
    setConfirmClear(false)
    setMessage('')
    setIsClearing(true)
    const response = await fetch(`/api/orders${conAjustes ? '?ajustes=1' : ''}`, { method: 'DELETE' })
    setIsClearing(false)
    if (!response.ok) {
      setMessage('No se pudo borrar la lista.')
      return
    }
    setMessage(!orders.length ? 'Alias y monto borrados.' : conAjustes ? 'Lista, alias y monto borrados. El detalle quedó en Telegram.' : 'Lista borrada. El detalle quedó en Telegram.')
    await Promise.all([mutate(), conAjustes && mutateSettings()])
  }

  async function copyAlias() {
    if (!settings?.alias) return
    try { await navigator.clipboard.writeText(settings.alias) } catch { return }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const total = orders.reduce((sum, order) => sum + order.quantity, 0)
  const price = settings?.price ?? null
  const cantidad = Number(quantity)
  const hasSettings = Boolean(settings?.alias || price)
  // Se cobra recien cuando el admin cargo alias y precio: antes no hay a donde ni cuanto pagar.
  const cobrando = Boolean(settings?.alias && price)

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8ed] text-[#3c201b]">
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:radial-gradient(#e8a43a_1px,transparent_1px)] [background-size:24px_24px]" />
      <section className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f2c46d] bg-[#fff0c9] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#9a4e26]"><PartyPopper className="size-4" /> Evento interno</div>
            <h1 className="max-w-xl text-5xl font-black tracking-[-0.06em] text-[#762d23] sm:text-7xl">Viernes de<br /><span className="text-[#e36d2f]">sanguchitos</span></h1>
            <p className="mt-4 max-w-md text-base leading-7 text-[#785b50]">Sumate a la lista y ayudanos a calcular cuántos sanguchitos preparar.</p>
          </div>
          <div className="flex flex-col items-end gap-3"><div className="hidden rounded-3xl border-2 border-[#f2c46d] bg-[#ffe9a9] p-4 text-[#a34d25] shadow-[4px_5px_0_#f2c46d] sm:block"><Sandwich className="size-14" strokeWidth={1.5} /></div><Link href="/admin" aria-label="Admin" title="Admin" className="flex size-9 items-center justify-center rounded-xl text-[#d8b49c] transition-colors hover:bg-[#fff0c9] hover:text-[#762d23]"><LockKeyhole className="size-4" /></Link></div>
        </header>

        {(settings?.alias || price) && (
          <div className="mb-6 rounded-[2rem] border-2 border-[#762d23] bg-[#fff0c9] p-5 shadow-[5px_6px_0_#762d23] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#e36d2f] text-white"><Wallet className="size-5" /></div><h2 className="text-xl font-black text-[#762d23]">Datos para pagar</h2></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {price && <div className="rounded-2xl border border-[#f2c46d] bg-white px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b36b37]">Precio por sanguchito</p><p className="mt-1 text-3xl font-black text-[#e36d2f]">{pesos(price)}</p></div>}
              {settings?.alias && <div className="flex flex-col items-start gap-3 rounded-2xl border border-[#f2c46d] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 max-w-full"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b36b37]">Alias para transferir</p><p className="mt-1 text-2xl font-black break-words text-[#542d24] select-all">{settings.alias}</p></div><Button type="button" variant="ghost" onClick={copyAlias} className="h-10 shrink-0 rounded-xl border border-[#f2c46d] bg-[#fff8ed] px-3 font-bold text-[#a34d25] hover:bg-[#fff0c9] hover:text-[#762d23]">{copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />} {copied ? 'Copiado' : 'Copiar'}</Button></div>}
            </div>
            {settings?.alias && settings.aliasUpdatedAt && <p className="mt-3 text-xs text-[#a87967]">Alias cargado el {fechaHora(settings.aliasUpdatedAt)}</p>}
          </div>
        )}

        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="rounded-[2rem] border-2 border-[#762d23] bg-[#e36d2f] p-6 text-white shadow-[7px_8px_0_#762d23] sm:p-8">
            <div className="mb-8 flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-[#ffe9a9] text-[#762d23]"><Plus /></div><div><h2 className="text-2xl font-black">Agregate a la lista</h2><p className="text-sm text-[#ffe9cf]">Es rápido y sin vueltas.</p></div></div>
            <form className="flex flex-col gap-5" onSubmit={addOrder}>
              <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="name">Tu nombre<input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Romina" maxLength={80} required className="h-14 rounded-2xl border-2 border-[#f59b62] bg-[#fff8ed] px-4 text-base font-medium text-[#3c201b] outline-none placeholder:text-[#b98b75] focus:border-[#ffe9a9] focus:ring-4 focus:ring-[#ffe9a9]/30" /></label>
              <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="quantity">¿Cuántos querés?<input id="quantity" type="number" min="1" max="99" value={quantity} onChange={(event) => setQuantity(event.target.value)} required className="h-14 rounded-2xl border-2 border-[#f59b62] bg-[#fff8ed] px-4 text-base font-medium text-[#3c201b] outline-none focus:border-[#ffe9a9] focus:ring-4 focus:ring-[#ffe9a9]/30" />{price && Number.isInteger(cantidad) && cantidad > 0 && <span className="text-sm font-medium text-[#ffe9cf]">Te sale {pesos(price * cantidad)}</span>}</label>
              <Button type="submit" disabled={isSaving} className="mt-2 h-14 rounded-2xl bg-[#ffe9a9] text-base font-black text-[#762d23] hover:bg-white">{isSaving ? 'Guardando...' : 'Anotar pedido'} <Check data-icon="inline-end" /></Button>
            </form>
            {message && <p className="mt-4 text-center text-sm font-bold text-[#fff1c7]">{message}</p>}
          </div>

          <div className="rounded-[2rem] border-2 border-[#f2c46d] bg-white/80 p-6 shadow-[4px_5px_0_#f2c46d] backdrop-blur-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#b36b37]"><ClipboardList className="size-4" /> Lista compartida</div><h2 className="mt-2 text-3xl font-black text-[#762d23]">¿Quiénes se prenden?</h2></div><div className="rounded-2xl bg-[#fff0c9] px-4 py-2 text-center"><div className="text-2xl font-black text-[#e36d2f]">{total}</div><div className="text-[10px] font-bold uppercase tracking-wider text-[#9a4e26]">sanguchitos</div></div></div></div>
            {isLoading ? <div className="flex min-h-48 items-center justify-center text-[#a87967]"><RotateCcw className="mr-2 size-4 animate-spin" /> Cargando...</div> : orders.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#f2c46d] bg-[#fffaf1] px-6 text-center"><Sandwich className="mb-3 size-10 text-[#e9a64b]" /><p className="font-bold text-[#762d23]">Todavía no hay pedidos</p><p className="mt-1 text-sm text-[#a87967]">Sé el primero en sumarte.</p></div> : <ul className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1 [scrollbar-color:#e9a64b_transparent] [scrollbar-width:thin]">{orders.map((order, index) => <li key={order.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${order.paidAt ? 'border-[#b9dfa6] bg-[#f2fbea]' : 'border-[#f4dfb6] bg-[#fffaf1]'}`}><div className="flex min-w-0 items-center gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${order.paidAt ? 'bg-[#4f9d3a]' : 'bg-[#e36d2f]'}`}>{orders.length - index}</span><div className="min-w-0"><p className="truncate font-bold text-[#542d24]">{order.name}</p>{cobrando && price && <p className={`text-xs font-bold ${order.paidAt ? 'text-[#4f9d3a]' : 'text-[#b36b37]'}`}>{order.paidAt ? 'Pagó' : 'A pagar'} {pesos(order.quantity * price)}</p>}</div></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-xl bg-[#ffe9a9] px-3 py-1.5 text-sm font-black text-[#9a4e26]">{order.quantity} {order.quantity === 1 ? 'sanguchito' : 'sanguchitos'}</span>{cobrando && <button type="button" onClick={() => togglePaid(order)} disabled={payingId === order.id} aria-pressed={Boolean(order.paidAt)} title={order.paidAt ? 'Desmarcar pago' : 'Marcar que pagué'} className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-black transition-colors disabled:opacity-40 ${order.paidAt ? 'border-[#4f9d3a] bg-[#4f9d3a] text-white hover:bg-[#3f8430]' : 'border-[#f2c46d] bg-white text-[#a34d25] hover:border-[#4f9d3a] hover:text-[#4f9d3a]'}`}>{order.paidAt ? <BadgeCheck className="size-4" /> : <Wallet className="size-4" />}{order.paidAt ? 'Pagado' : 'Pagué'}</button>}<button type="button" onClick={() => removeOrder(order)} disabled={removingId === order.id} aria-label={`Dar de baja a ${order.name}`} title={`Dar de baja a ${order.name}`} className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#f4dfb6] text-[#b36b37] transition-colors hover:border-[#e36d2f] hover:bg-[#fff0c9] hover:text-[#762d23] disabled:opacity-40"><Trash2 className="size-4" /></button></div></li>)}</ul>}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#f4dfb6] pt-5"><p className="text-xs text-[#a87967]">La lista se actualiza automáticamente.<br />Si no podés venir, dale al tacho de tu fila.</p><Button type="button" variant="ghost" onClick={askClear} disabled={(!orders.length && !hasSettings) || isClearing} className="shrink-0 text-[#a34d25] hover:bg-[#fff0c9] hover:text-[#762d23]"><Trash2 data-icon="inline-start" /> {isClearing ? 'Borrando...' : 'Limpiar lista'}</Button></div>
          </div>
        </div>
        <footer className="pt-8 text-center text-xs font-medium text-[#b8907b]">Hecho para compartir una buena mesa.</footer>
      </section>

      {confirmClear && (
        <div role="dialog" aria-modal="true" aria-labelledby="clear-title" onClick={() => setConfirmClear(false)} onKeyDown={(event) => event.key === 'Escape' && setConfirmClear(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c201b]/50 px-5 backdrop-blur-sm">
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-[2rem] border-2 border-[#762d23] bg-[#fff8ed] p-6 shadow-[6px_7px_0_#762d23] sm:p-7">
            <div className="flex items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#e36d2f] text-white"><Trash2 className="size-5" /></div><h2 id="clear-title" className="text-xl font-black text-[#762d23]">{orders.length ? '¿Borrar la lista completa?' : '¿Borrar alias y monto?'}</h2></div>
            <p className="mt-4 text-sm leading-6 text-[#785b50]">{orders.length ? `Son ${orders.length} ${orders.length === 1 ? 'anotado' : 'anotados'}. Antes de borrar se manda el detalle al bot de Telegram.` : 'La lista ya está vacía.'}</p>
            {hasSettings && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#f2c46d] bg-white px-4 py-3 text-sm font-bold text-[#542d24]"><input type="checkbox" checked={clearSettings} onChange={(event) => setClearSettings(event.target.checked)} className="mt-0.5 size-4 accent-[#e36d2f]" />Borrar también el alias y el monto por sanguchito</label>}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" autoFocus onClick={() => setConfirmClear(false)} className="rounded-xl font-bold text-[#a34d25] hover:bg-[#fff0c9] hover:text-[#762d23]">Cancelar</Button>
              <Button type="button" onClick={clearOrders} disabled={!orders.length && !clearSettings} className="rounded-xl bg-[#e36d2f] font-black text-white hover:bg-[#762d23]"><Trash2 data-icon="inline-start" /> Borrar</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
