/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // better-sqlite3 es un modulo nativo (.node). Si Next intenta empaquetarlo
  // el binario queda afuera del build y revienta al arrancar.
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
