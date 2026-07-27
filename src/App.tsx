import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Ajustes from './pages/Ajustes'
import Casas from './pages/Casas'
import Comercios from './pages/Comercios'
import Familias from './pages/Familias'
import Freelancers from './pages/Freelancers'
import Mapa from './pages/Mapa'
import Painel from './pages/Painel'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Painel />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="comercios" element={<Comercios />} />
        <Route path="freelancers" element={<Freelancers />} />
        <Route path="casas" element={<Casas />} />
        <Route path="familias" element={<Familias />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
