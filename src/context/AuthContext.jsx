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
      const { data } = await getMiRol(user.id)
      if (!activo) return
      setEsAdmin(data?.rol === 'admin')
      setCargandoRol(false)
    }
    cargarRol()
    return () => {
      activo = false
    }
  }, [loading, user?.id])

  const signUp = async (nombre, email, password, betaRef) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          ...(betaRef ? { beta_ref: betaRef } : {}),
        },
      },
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { data, error }

    // signInWithPassword ya deja la sesión establecida internamente en el
    // cliente de Supabase, pero no es una garantía instantánea observable
    // desde fuera: confirmamos con una llamada real (no un temporizador
    // arbitrario) que el cliente tiene la sesión realmente lista antes de
    // dar el login por completado. Sin esto, Login.jsx podía navegar a un
    // destino protegido (p. ej. /usuarios/:id) justo antes de que esa
    // sesión estuviera disponible para la siguiente petición — la RPC de
    // esa pantalla llegaba a viajar sin (o con) un JWT no del todo
    // asentado, y Supabase respondía 401 (PGRST303).
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) {
      return { data, error: { message: 'No se pudo establecer la sesión. Inténtalo de nuevo.' } }
    }

    // Actualiza el estado de React de inmediato, sin esperar a que
    // onAuthStateChange dispare su propio callback (que también lo hará,
    // con el mismo valor, sin efecto adicional) — así cualquier pantalla
    // que dependa de `user` desde el primer render posterior a la
    // navegación ya lo tiene disponible, en vez de arrancar con user=null
    // y depender de un segundo render para corregirse.
    setUser(sessionData.session.user)

    return { data, error: null }
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
