import {Navigate } from 'react-router-dom'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const accessToken = localStorage.getItem('accessToken')
  if (!accessToken) {
    return <Navigate to="/login" replace />
   }
  return children
}

export default AuthGuard
