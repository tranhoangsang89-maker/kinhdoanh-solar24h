import { useState, useEffect } from 'react'
import Login from './Login'
import AdminDashboard from './AdminDashboard'
import SalesDashboard from './SalesDashboard'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const savedUser = sessionStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLogin = (userData) => {
    sessionStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('user')
    setUser(null)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  if (user.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />
  }

  return <SalesDashboard user={user} onLogout={handleLogout} />
}

export default App
