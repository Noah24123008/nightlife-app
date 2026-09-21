import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import AceptacionLegalModal from '../components/AceptacionLegalModal'
import { useAceptacionLegalPendiente } from '../hooks/useAceptacionLegalPendiente'

export default function AppLayout() {
  const { pendiente, marcarAceptado } = useAceptacionLegalPendiente()

  return (
    <div className="app-layout">
      <Outlet />
      <BottomNav />
      {pendiente && <AceptacionLegalModal onAceptado={marcarAceptado} />}
    </div>
  )
}
