import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <div className="placeholder-screen">
      <h1>Sesión iniciada</h1>
      <p>Bienvenido/a, {user?.email}.</p>
      <p className="placeholder-note">
        Esta es una pantalla temporal solo para comprobar que el registro, el login y la sesión
        funcionan correctamente. El ranking diario, los locales y los eventos se construirán en la
        siguiente fase.
      </p>
      <button onClick={signOut}>Cerrar sesión</button>
    </div>
  )
}
