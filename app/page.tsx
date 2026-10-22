'use client'

import useSWR from 'swr'
import { FormEvent, useState } from 'react'
import { Check, ClipboardList, PartyPopper, Plus, RotateCcw, Sandwich, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Order = { id: string; name: string; quantity: number; createdAt: string }
const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((response) => response.json())

export default function Page() {
  const { data: orders = [], mutate, isLoading } = useSWR<Order[]>('/api/orders', fetcher, { refreshInterval: 5000 })
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)

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

  async function clearOrders() {
    if (!orders.length) return
    if (!window.confirm(`¿Borrar la lista completa? Son ${orders.length} anotados. Se manda el detalle al bot antes de borrar.`)) return
    setMessage('')
    setIsClearing(true)
    const response = await fetch('/api/orders', { method: 'DELETE' })
    setIsClearing(false)
    if (!response.ok) {
      setMessage('No se pudo borrar la lista.')
      return
    }
    setMessage('Lista borrada. El detalle quedó en Telegram.')
    await mutate()
  }

  const total = orders.reduce((sum, order) => sum + order.quantity, 0)

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
          <div className="hidden rounded-3xl border-2 border-[#f2c46d] bg-[#ffe9a9] p-4 text-[#a34d25] shadow-[4px_5px_0_#f2c46d] sm:block"><Sandwich className="size-14" strokeWidth={1.5} /></div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="rounded-[2rem] border-2 border-[#762d23] bg-[#e36d2f] p-6 text-white shadow-[7px_8px_0_#762d23] sm:p-8">
            <div className="mb-8 flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-[#ffe9a9] text-[#762d23]"><Plus /></div><div><h2 className="text-2xl font-black">Agregate a la lista</h2><p className="text-sm text-[#ffe9cf]">Es rápido y sin vueltas.</p></div></div>
            <form className="flex flex-col gap-5" onSubmit={addOrder}>
              <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="name">Tu nombre<input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Romina" maxLength={80} required className="h-14 rounded-2xl border-2 border-[#f59b62] bg-[#fff8ed] px-4 text-base font-medium text-[#3c201b] outline-none placeholder:text-[#b98b75] focus:border-[#ffe9a9] focus:ring-4 focus:ring-[#ffe9a9]/30" /></label>
              <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="quantity">¿Cuántos querés?<input id="quantity" type="number" min="1" max="99" value={quantity} onChange={(event) => setQuantity(event.target.value)} required className="h-14 rounded-2xl border-2 border-[#f59b62] bg-[#fff8ed] px-4 text-base font-medium text-[#3c201b] outline-none focus:border-[#ffe9a9] focus:ring-4 focus:ring-[#ffe9a9]/30" /></label>
              <Button type="submit" disabled={isSaving} className="mt-2 h-14 rounded-2xl bg-[#ffe9a9] text-base font-black text-[#762d23] hover:bg-white">{isSaving ? 'Guardando...' : 'Anotar pedido'} <Check data-icon="inline-end" /></Button>
            </form>
            {message && <p className="mt-4 text-center text-sm font-bold text-[#fff1c7]">{message}</p>}
          </div>

          <div className="rounded-[2rem] border-2 border-[#f2c46d] bg-white/80 p-6 shadow-[4px_5px_0_#f2c46d] backdrop-blur-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#b36b37]"><ClipboardList className="size-4" /> Lista compartida</div><h2 className="mt-2 text-3xl font-black text-[#762d23]">¿Quiénes se prenden?</h2></div><div className="rounded-2xl bg-[#fff0c9] px-4 py-2 text-center"><div className="text-2xl font-black text-[#e36d2f]">{total}</div><div className="text-[10px] font-bold uppercase tracking-wider text-[#9a4e26]">sanguchitos</div></div></div></div>
            {isLoading ? <div className="flex min-h-48 items-center justify-center text-[#a87967]"><RotateCcw className="mr-2 size-4 animate-spin" /> Cargando...</div> : orders.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#f2c46d] bg-[#fffaf1] px-6 text-center"><Sandwich className="mb-3 size-10 text-[#e9a64b]" /><p className="font-bold text-[#762d23]">Todavía no hay pedidos</p><p className="mt-1 text-sm text-[#a87967]">Sé el primero en sumarte.</p></div> : <ul className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1 [scrollbar-color:#e9a64b_transparent] [scrollbar-width:thin]">{orders.map((order, index) => <li key={order.id} className="flex items-center justify-between rounded-2xl border border-[#f4dfb6] bg-[#fffaf1] px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[#e36d2f] text-sm font-black text-white">{orders.length - index}</span><span className="font-bold text-[#542d24]">{order.name}</span></div><div className="flex items-center gap-2"><span className="rounded-xl bg-[#ffe9a9] px-3 py-1.5 text-sm font-black text-[#9a4e26]">{order.quantity} {order.quantity === 1 ? 'sanguchito' : 'sanguchitos'}</span><button type="button" onClick={() => removeOrder(order)} disabled={removingId === order.id} aria-label={`Dar de baja a ${order.name}`} title={`Dar de baja a ${order.name}`} className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#f4dfb6] text-[#b36b37] transition-colors hover:border-[#e36d2f] hover:bg-[#fff0c9] hover:text-[#762d23] disabled:opacity-40"><Trash2 className="size-4" /></button></div></li>)}</ul>}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#f4dfb6] pt-5"><p className="text-xs text-[#a87967]">La lista se actualiza automáticamente.<br />Si no podés venir, dale al tacho de tu fila.</p><Button type="button" variant="ghost" onClick={clearOrders} disabled={!orders.length || isClearing} className="shrink-0 text-[#a34d25] hover:bg-[#fff0c9] hover:text-[#762d23]"><Trash2 data-icon="inline-start" /> {isClearing ? 'Borrando...' : 'Limpiar lista'}</Button></div>
          </div>
        </div>
        <footer className="pt-8 text-center text-xs font-medium text-[#b8907b]">Hecho para compartir una buena mesa.</footer>
      </section>
    </main>
  )
}
