import { useState } from 'react'
import './Login.css'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || 'Đăng nhập thất bại')
      }
      
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-bg-effects">
        <div className="glow-orb green-orb"></div>
        <div className="glow-orb gold-orb"></div>
      </div>
      
      <div className="login-box-premium">
        <div className="login-left">
          <div className="brand-title" style={{ marginBottom: '40px', textAlign: 'center' }}>
            <div className="logo-container">
              <img src="/logo.png" alt="Solar 24H Logo" className="logo-img" />
            </div>
          </div>
          <p className="brand-subtitle" style={{ textAlign: 'center' }}>
            Hệ thống quản trị khách hàng & KPI dành riêng cho đội ngũ kinh doanh tinh nhuệ. Đăng nhập để kích hoạt năng lượng và bứt phá giới hạn!
          </p>
        </div>
        
        <div className="login-right">
          <h3>Welcome Back</h3>
          <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>Vui lòng đăng nhập để tiếp tục</p>
          
          <form onSubmit={handleSubmit}>
            <div className="input-premium">
              <input 
                type="text" 
                placeholder="Tên đăng nhập" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                required 
              />
            </div>
            <div className="input-premium">
              <input 
                type="password" 
                placeholder="Mật khẩu" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            
            {error && <p style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
            
            <button type="submit" className="btn-login-glow">🚀 BỨT PHÁ DOANH SỐ</button>
          </form>
        </div>
      </div>
    </div>
  )
}
