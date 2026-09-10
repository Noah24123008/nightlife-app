import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buscarPerfilesPublicos } from '../lib/api'
import PersonaChip from '../components/PersonaChip'
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
    <div className="app-screen">
      <Link to="/" className="ficha-volver">
        ← Inicio
      </Link>

      <header className="screen-header">
        <span className="screen-title">Buscar</span>
      </header>

      <input
        type="text"
        className="buscar-input"
        placeholder="Nombre o @usuario"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        autoFocus
      />

      {!terminoValido ? (
        <p className="inicio-vacio">Busca personas por nombre o usuario.</p>
      ) : buscando ? (
        <p className="app-loading">Buscando...</p>
      ) : error ? (
        <p className="auth-error">{error}</p>
      ) : resultados.length === 0 ? (
        <p className="inicio-vacio">No se encontraron usuarios.</p>
      ) : (
        <div className="votantes-lista votantes-lista--columna">
          {resultados.map((perfil) => (
            <PersonaChip key={perfil.id} perfil={perfil} />
          ))}
        </div>
      )}
    </div>
  )
}
