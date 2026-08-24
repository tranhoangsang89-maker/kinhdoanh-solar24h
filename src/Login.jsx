import { useState } from 'react'
import { supabase } from './supabaseClient'
import './Login.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      if (isSignUp) {
        // Sign up new user
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
        })
        
        if (signUpError) throw signUpError
        
        if (data.user) {
          // Create profile record for new user
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { id: data.user.id, full_name: fullName, role: 'sales' }
            ])
            
          if (profileError) {
             console.error('Error creating profile:', profileError)
             // We won't throw here just in case RLS blocked it, but the DB script allows insert if uid matches.
          }
          
          alert('Đăng ký thành công! Vui lòng đăng nhập lại.')
          setIsSignUp(false)
        }
      } else {
        // Login existing user
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        })
        
        if (signInError) throw signInError
        
        if (data.user) {
          // Fetch profile info
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()
            
          const userData = {
            id: data.user.id,
            email: data.user.email,
            full_name: profileData?.full_name || email.split('@')[0],
            role: profileData?.role || 'sales',
            avatar_url: profileData?.avatar_url
          }
          onLogin(userData)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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
          <h3>{isSignUp ? 'Tạo Tài Khoản' : 'Welcome Back'}</h3>
          <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>
            {isSignUp ? 'Đăng ký tài khoản Sales mới' : 'Vui lòng đăng nhập để tiếp tục'}
          </p>
          
          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="input-premium">
                <input 
                  type="text" 
                  placeholder="Họ và Tên" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
              </div>
            )}
            <div className="input-premium">
              <input 
                type="email" 
                placeholder="Email đăng nhập" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="input-premium">
              <input 
                type="password" 
                placeholder="Mật khẩu (từ 6 ký tự)" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required 
                minLength={6}
              />
            </div>
            
            {error && <p style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
            
            <button type="submit" className="btn-login-glow" disabled={loading}>
              {loading ? 'Đang xử lý...' : (isSignUp ? '✨ ĐĂNG KÝ TÀI KHOẢN' : '🚀 BỨT PHÁ DOANH SỐ')}
            </button>
            
            <p style={{marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem'}}>
              {isSignUp ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
              <span 
                style={{color: 'var(--gold-accent)', cursor: 'pointer', textDecoration: 'underline'}} 
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Đăng nhập ngay' : 'Đăng ký mới'}
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
