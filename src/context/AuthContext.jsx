import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getSolicitudesPendientesRecibidas, getMiRol } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [numSolicitudesPendientes, setNumSolicitudesPendientes] = useState(0)
  // Estado de admin, usado solo por AdminRoute y el panel /admin. No afecta
  // a nada de la app pública; el resto de pantallas ni lo consultan.
  const [esAdmin, setEsAdmin] = useState(false)
  const [cargandoRol, setCargandoRol] = useState(true)

  // Contador compartido para el badge de Social en el BottomNav. Vive aquí
  // (no en Social.jsx) porque el BottomNav está montado una sola vez fuera
  // de las páginas y no se remonta al navegar, así que necesita un sitio
  // común, ya accesible en toda la app vía useAuth(), para leerlo y para
  // que otras pantallas (Social, Notificaciones) lo refresquen tras
  // aceptar/rechazar.
  async function refrescarSolicitudesPendientes(usuarioId) {
    if (!usuarioId) {
      setNumSolicitudesPendientes(0)
      return
    }
    const { data } = await getSolicitudesPendientesRecibidas(usuarioId)
    setNumSolicitudesPendientes((data ?? []).length)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Al cargar la app (o al iniciar/cerrar sesión), calcula el contador real.
  useEffect(() => {
    refrescarSolicitudesPendientes(user?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    // No tocar cargandoRol hasta que la resolución inicial de sesión haya
    // terminado (loading === false). Si se dispara antes, con user aún sin
    // resolver, cargandoRol podría quedar en false prematuramente y
    // AdminRoute vería esAdmin=false (su valor por defecto, aún no
    // recalculado) como si ya fuera definitivo — esa era la carrera.
    if (loading) return

    let activo = true
    async function cargarRol() {
      if (!user?.id) {
        setEsAdmin(false)
        setCargandoRol(false)
        return
      }
      setCargandoRol(true)
      const { data, error } = await getMiRol(user.id)
      
      if (!activo) return
      setEsAdmin(data?.rol === 'admin')
      setCargandoRol(false)
    }
    cargarRol()
    return () => {
      activo = false
    }
  }, [loading, user?.id])

  const signUp = async (nombre, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const requestPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-password`,
    })
    return { error }
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    numSolicitudesPendientes,
    refrescarSolicitudesPendientes,
    esAdmin,
    cargandoRol,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return context
}
