import { useEffect, useState } from 'react'
import { adminMetricas } from '../../lib/api'

export default function AdminDashboard() {
  const [metricas, setMetricas] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError('')
      const { data, error: err } = await adminMetricas()
      if (!activo) return
      if (err) {
        setError('No se pudieron cargar las métricas.')
      } else {
        setMetricas(data?.[0] ?? null)
      }
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [])

  if (cargando) return <p className="app-loading">Cargando métricas...</p>
  if (error) return <p className="auth-error">{error}</p>

  const tarjetas = [
    { etiqueta: 'Usuarios', valor: metricas?.total_usuarios ?? 0 },
    { etiqueta: 'Locales activos', valor: metricas?.locales_activos ?? 0 },
    { etiqueta: 'Eventos próximos', valor: metricas?.eventos_proximos ?? 0 },
    { etiqueta: 'Votos de hoy', valor: metricas?.votos_hoy ?? 0 },
  ]

  return (
    <div className="admin-v1-metricas">
      {tarjetas.map((t) => (
        <div key={t.etiqueta} className="admin-v1-metrica-card">
          <span className="admin-v1-metrica-numero">{t.valor}</span>
          <span className="admin-v1-metrica-etiqueta">{t.etiqueta}</span>
        </div>
      ))}
    </div>
  )
}
