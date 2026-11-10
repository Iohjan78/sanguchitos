import { NextResponse } from 'next/server'
import { claveValida } from '@/lib/admin'

// Solo confirma si la clave sirve, para que el panel muestre los campos.
// No hay sesion: la clave viaja en cada guardado y se valida de nuevo ahi.
export async function POST(request: Request) {
  if (!claveValida(request.headers.get('x-admin-password'))) {
    return NextResponse.json({ error: 'Clave incorrecta.' }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
