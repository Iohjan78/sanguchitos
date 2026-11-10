// Next llama a register() una sola vez, al arrancar el servidor. Es el lugar
// para dejar corriendo el reinicio de los jueves. El import va adentro del if
// porque SQLite solo existe en el runtime de Node, no en el edge.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { iniciarReinicioSemanal } = await import('./lib/jueves')
    iniciarReinicioSemanal()
  }
}
