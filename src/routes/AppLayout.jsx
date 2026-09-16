import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Outlet />
      <BottomNav />
    </div>
  )
}
