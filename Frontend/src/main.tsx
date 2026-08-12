import { createRoot } from 'react-dom/client'
import Login from './pages/login'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import Servers from './pages/servers'
import Chat from './pages/chat'
import ModelConfigPage from './pages/modelConfig'
import Topology from './pages/topology'
import Knowledge from './pages/knowledge'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AuthGuard><Topology /></AuthGuard>,
  },
  {
    path: '/servers',
    element: <AuthGuard><Servers /></AuthGuard>,
  },
  {
    path: '/chat',
    element: <AuthGuard><Chat /></AuthGuard>,
  },
  {
    path: '/model-configs',
    element: <AuthGuard><ModelConfigPage /></AuthGuard>,
  },
  {
    path: '/knowledge',
    element: <AuthGuard><Knowledge /></AuthGuard>,
  },
])

createRoot(document.getElementById('root')!).render(
    <RouterProvider router={router} />
)
