import { useState, useEffect } from 'react'
import Login from './Login'
import SalesDashboard from './SalesDashboard'
import { supabase } from './supabaseClient'
import AdminDashboard from './AdminDashboard'
import ChatBotWidget from './components/ChatBotWidget'
import './index.css'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const savedUser = sessionStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }

    // Check actual supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        handleLogout()
      } else {
        // Fetch latest profile to keep avatar and name fresh across reloads
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profile) {
            const latestUser = {
              id: session.user.id,
              email: session.user.email,
              full_name: profile.full_name || session.user.email.split('@')[0],
              role: profile.role || 'sales',
              avatar_url: profile.avatar_url
            }
            setUser(latestUser)
            sessionStorage.setItem('user', JSON.stringify(latestUser))
          }
        } catch (err) {
          console.error("Error refreshing profile", err)
        }
      }
    })

    // Listen for auth changes (e.g. token expired, logout in other tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        handleLogout()
      }
    })

    return () => {
      subscription.unsubscribe()
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

  const handleUpdateUser = (updates) => {
    const newUser = { ...user, ...updates }
    sessionStorage.setItem('user', JSON.stringify(newUser))
    setUser(newUser)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <>
      {user.role === 'admin' ? (
        <AdminDashboard user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
      ) : (
        <SalesDashboard user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
      )}
      
      {/* External Widgets */}
      <ChatBotWidget />
    </>
  )
}

export default App
