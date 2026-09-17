import { useEffect, useState } from 'react'
import { buscarPerfilesPublicos } from '../lib/api'
import PersonaChip from '../components/PersonaChip'
import { SkeletonPersonaFila } from '../components/Skeleton'
import BackButton from '../components/BackButton'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { esErrorDeAutenticacion, mensajeError } from '../lib/errors'

export default function Buscar() {
  const { signOut } = useAuth()
  const [termino, setTermino] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const limpio = termino.trim()
    if (limpio.length < 2) {
      setResultados([])
      setBuscando(false)
      setError('')
      return
    }

    let activo = true
    setBuscando(true)
    setError('')

    const temporizador = setTimeout(async () => {
      const { data, error: errBusqueda } = await buscarPerfilesPublicos(limpio)
      if (!activo) return
      if (errBusqueda) {
        setError(mensajeError(errBusqueda, 'No se pudo completar la búsqueda. Inténtalo de nuevo.'))
        setResultados([])
        if (esErrorDeAutenticacion(errBusqueda)) setTimeout(() => signOut(), 2000)
      } else {
        setResultados(data ?? [])
      }
      setBuscando(false)
    }, 300)

    return () => {
      activo = false
      clearTimeout(temporizador)
    }
  }, [termino])

  const terminoValido = termino.trim().length >= 2

  return (
    <div className="app-screen buscar-v2">
      <div className="buscar-v2-contenido">
        <BackButton />

        <h1 className="buscar-v2-titulo">Buscar</h1>

        <div className="buscar-v2-input-wrap">
          <span className="buscar-v2-input-icono" aria-hidden="true">
            🔍
          </span>
          <input
            type="text"
            className="buscar-v2-input"
            placeholder="Nombre o @usuario"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            autoFocus
          />
        </div>

        {!terminoValido ? (
          <p className="inicio-vacio">Busca personas por nombre o usuario.</p>
        ) : buscando ? (
          <div className="votantes-lista votantes-lista--columna">
            <SkeletonPersonaFila />
            <SkeletonPersonaFila />
            <SkeletonPersonaFila />
          </div>
        ) : error ? (
          <p className="auth-error">{error}</p>
        ) : resultados.length === 0 ? (
          <EmptyState
            icono="🔍"
            titulo="Sin resultados"
            texto="Prueba con otro nombre o usuario."
          />
        ) : (
          <div className="votantes-lista votantes-lista--columna">
            {resultados.map((perfil) => (
              <div key={perfil.id} className="buscar-v2-fila">
                <PersonaChip perfil={perfil} />
                <span className="buscar-v2-chevron" aria-hidden="true">
                  ›
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
