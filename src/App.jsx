import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import AppLayout from './routes/AppLayout'
import Register from './pages/Register'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Inicio from './pages/Inicio'
import Locales from './pages/Locales'
import Mapa from './pages/Mapa'
import FichaLocal from './pages/FichaLocal'
import FichaEvento from './pages/FichaEvento'
import Perfil from './pages/Perfil'
import PerfilPublico from './pages/PerfilPublico'
import ListaSeguimiento from './pages/ListaSeguimiento'
import Buscar from './pages/Buscar'
import Notificaciones from './pages/Notificaciones'
import DondeVaLaGente from './pages/DondeVaLaGente'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/registro" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-password" element={<ForgotPassword />} />
          <Route path="/restablecer-password" element={<ResetPassword />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Inicio />} />
            <Route path="/locales" element={<Locales />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/locales/:id" element={<FichaLocal />} />
            <Route path="/eventos/:id" element={<FichaEvento />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/usuarios/:id" element={<PerfilPublico />} />
            <Route path="/usuarios/:id/:tipo" element={<ListaSeguimiento />} />
            <Route path="/buscar" element={<Buscar />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/hoy" element={<DondeVaLaGente />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
