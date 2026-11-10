'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Check, KeyRound, LockKeyhole, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// La clave vive solo en memoria: se pide cada vez que se entra al admin,
// incluso al recargar. El servidor la valida de nuevo en cada guardado.

const inputClass = 'h-14 rounded-2xl border-2 border-[#f59b62] bg-[#fff8ed] px-4 text-base font-medium text-[#3c201b] outline-none placeholder:text-[#b98b75] focus:border-[#ffe9a9] focus:ring-4 focus:ring-[#ffe9a9]/30'

export default function AdminPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [alias, setAlias] = useState('')
  const [price, setPrice] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
      setAlias(data.alias ?? '')
      setPrice(data.price ? String(data.price) : '')
    })
  }, [])

  async function entrar(clave: string) {
    setIsBusy(true)
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'x-admin-password': clave } })
    setIsBusy(false)
    if (!response.ok) { setMessage('Clave incorrecta.'); return }
    setPassword(clave); setIsAuthed(true); setMessage('')
  }

  function salir() {
    setPassword(''); setIsAuthed(false); setMessage('')
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await entrar(password)
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsBusy(true)
    const response = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify({ alias, price }) })
    setIsBusy(false)
    if (response.status === 401) { salir(); setMessage('La clave ya no es válida. Entrá de nuevo.'); return }
    if (!response.ok) { setMessage('Revisá el alias y el precio.'); return }
    router.push('/')
  }

  async function borrar() {
    if (!window.confirm('¿Borrar el alias y el precio? La landing queda sin datos para pagar.')) return
    setMessage('')
    setIsBusy(true)
    const response = await fetch('/api/settings', { method: 'DELETE', headers: { 'x-admin-password': password } })
    setIsBusy(false)
    if (response.status === 401) { salir(); setMessage('La clave ya no es válida. Entrá de nuevo.'); return }
    if (!response.ok) { setMessage('No se pudo borrar.'); return }
    router.push('/')
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8ed] text-[#3c201b]">
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:radial-gradient(#e8a43a_1px,transparent_1px)] [background-size:24px_24px]" />
      <section className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 self-start text-sm font-bold text-[#9a4e26] hover:text-[#762d23]"><ArrowLeft className="size-4" /> Volver a la lista</Link>
        <div className="rounded-[2rem] border-2 border-[#762d23] bg-[#e36d2f] p-6 text-white shadow-[7px_8px_0_#762d23] sm:p-8">
          <div className="mb-8 flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-[#ffe9a9] text-[#762d23]">{isAuthed ? <KeyRound /> : <LockKeyhole />}</div><div><h1 className="text-2xl font-black">Admin</h1><p className="text-sm text-[#ffe9cf]">{isAuthed ? 'Alias y precio que ve todo el mundo.' : 'Ingresá la clave para editar.'}</p></div></div>
          {isAuthed ? (
            <form className="flex flex-col gap-5" onSubmit={guardar}>
              <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="alias">Alias para transferir<input id="alias" value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Ej. sanguchitos.viernes" maxLength={60} required className={inputClass} /></label>
              <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="price">Precio por sanguchito ($)<input id="price" type="number" min="1" max="1000000" step="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Ej. 1500" required className={inputClass} /></label>
              <Button type="submit" disabled={isBusy} className="mt-2 h-14 rounded-2xl bg-[#ffe9a9] text-base font-black text-[#762d23] hover:bg-white">{isBusy ? 'Guardando...' : 'Guardar'} <Check data-icon="inline-end" /></Button>
              <Button type="button" variant="ghost" onClick={borrar} disabled={isBusy || (!alias && !price)} className="h-12 rounded-2xl border-2 border-[#ffe9a9]/60 text-base font-bold text-white hover:bg-white/10 hover:text-white"><Trash2 data-icon="inline-start" /> Borrar alias y precio</Button>
              <Button type="button" variant="ghost" onClick={salir} className="text-[#ffe9cf] hover:bg-white/10 hover:text-white"><LogOut data-icon="inline-start" /> Salir</Button>
            </form>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={login}>
              <label className="flex flex-col gap-2 text-sm font-bold" htmlFor="password">Clave<input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className={inputClass} /></label>
              <Button type="submit" disabled={isBusy} className="mt-2 h-14 rounded-2xl bg-[#ffe9a9] text-base font-black text-[#762d23] hover:bg-white">{isBusy ? 'Entrando...' : 'Entrar'} <Check data-icon="inline-end" /></Button>
            </form>
          )}
          {message && <p className="mt-4 text-center text-sm font-bold text-[#fff1c7]">{message}</p>}
        </div>
      </section>
    </main>
  )
}
