import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getSolicitudesPendientesRecibidas } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [numSolicitudesPendientes, setNumSolicitudesPendientes] = useState(0)

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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return context
}
