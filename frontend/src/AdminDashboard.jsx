import { useState, useEffect, Fragment } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}/static/${url.replace(/\\/g, '/')}`;
};

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('kpi')
  
  // KPI Stats
  const [stats, setStats] = useState(null)
  
  // Contracts
  const [contracts, setContracts] = useState([])
  const [approvedContracts, setApprovedContracts] = useState([])
  
  // Customers
  const [customers, setCustomers] = useState([])
  
  // Daily Reports
  const [dailyReports, setDailyReports] = useState([])
  
  // Salary
  const [salaryData, setSalaryData] = useState([])

  useEffect(() => {
    if (activeTab === 'kpi') {
      fetch(`${API_URL}/admin/kpi-stats`)
        .then(res => res.json())
        .then(data => setStats(data))
    } else if (activeTab === 'contracts') {
      fetch(`${API_URL}/reports?report_type=contract`)
        .then(res => res.json())
        .then(data => setContracts(data))
    } else if (activeTab === 'customers') {
      fetch(`${API_URL}/customers`)
        .then(res => res.json())
        .then(data => setCustomers(data))
    } else if (activeTab === 'daily') {
      fetch(`${API_URL}/reports?report_type=daily_report`)
        .then(res => res.json())
        .then(data => setDailyReports(data))
    } else if (activeTab === 'salary') {
      const month = new Date().toLocaleDateString('en-GB', {month: '2-digit', year: 'numeric'}) // MM/YYYY
      fetch(`${API_URL}/admin/salary-stats?month=${month}`)
        .then(res => res.json())
        .then(data => setSalaryData(data))
        
      fetch(`${API_URL}/reports?report_type=contract&status=approved`)
        .then(res => res.json())
        .then(data => {
           const filtered = data.filter(r => {
               const reportDate = new Date(r.created_at + 'Z')
               const m = String(reportDate.getMonth() + 1).padStart(2, '0')
               const y = reportDate.getFullYear()
               return `${m}/${y}` === month
           })
           setApprovedContracts(filtered)
        })
    }
  }, [activeTab])

  const handleApprove = (id) => {
    fetch(`${API_URL}/reports/${id}/approve`, { method: 'POST' })
      .then(() => {
        setContracts(contracts.map(c => c.id === id ? { ...c, status: 'approved' } : c))
      })
  }

  const handleReject = (id) => {
    fetch(`${API_URL}/reports/${id}/reject`, { method: 'POST' })
      .then(() => {
        setContracts(contracts.map(c => c.id === id ? { ...c, status: 'rejected' } : c))
      })
  }

  const handleUndo = (id) => {
    fetch(`${API_URL}/reports/${id}/undo`, { method: 'POST' })
      .then(() => {
        setContracts(contracts.map(c => c.id === id ? { ...c, status: 'pending' } : c))
      })
  }

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="user-info">
          {user.avatar_url ? (
             <img src={getImageUrl(user.avatar_url)} alt="Avatar" />
          ) : (
             <img src="https://via.placeholder.com/100" alt="Avatar" />
          )}
          <h3>{user.full_name || 'ADMIN'}</h3>
        </div>
        <nav>
          <button className={activeTab === 'kpi' ? 'active' : ''} onClick={() => setActiveTab('kpi')}>Tổng quan KPI</button>
          <button className={activeTab === 'contracts' ? 'active' : ''} onClick={() => setActiveTab('contracts')}>Duyệt hợp đồng</button>
          <button className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}>Báo cáo hàng ngày</button>
          <button className={activeTab === 'customers' ? 'active' : ''} onClick={() => setActiveTab('customers')}>Danh sách khách hàng</button>
          <button className={activeTab === 'salary' ? 'active' : ''} onClick={() => setActiveTab('salary')}>Tổng quan lương</button>
        </nav>
        <button className="logout-btn" onClick={onLogout}>Đăng xuất</button>
      </div>
      
      <div className="main-content">
        
        {activeTab === 'kpi' && (
          <>
            <h2>Dashboard Tổng Quan Công Ty</h2>
            <div className="grid-3">
              <div className="glass-card">
                <div className="metric-label">👥 Tổng Khách hàng</div>
                <div className="metric-value">{stats ? stats.total_customers : '...'}</div>
              </div>
              <div className="glass-card">
                <div className="metric-label">📄 Hợp đồng đã duyệt</div>
                <div className="metric-value">{stats ? stats.total_contracts : '...'}</div>
              </div>
              <div className="glass-card gold-top">
                <div className="metric-label" style={{color: 'var(--gold-accent)'}}>⚡ Tổng kWp lắp đặt</div>
                <div className="metric-value" style={{color: 'var(--gold-accent)'}}>{stats ? stats.total_kwp : '...'}</div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'contracts' && (
          <>
            <h2>Duyệt Hợp Đồng</h2>
            <div className="glass-card">
              <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
                    <th style={{padding: '10px'}}>Ngày tạo</th>
                    <th style={{padding: '10px'}}>Sales</th>
                    <th style={{padding: '10px'}}>Nội dung</th>
                    <th style={{padding: '10px'}}>Công suất (kWp)</th>
                    <th style={{padding: '10px'}}>Trạng thái</th>
                    <th style={{padding: '10px'}}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id} style={{borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                      <td style={{padding: '10px'}}>{new Date(c.created_at + 'Z').toLocaleDateString('vi-VN')}</td>
                      <td style={{padding: '10px'}}>{c.sales_name}</td>
                      <td style={{padding: '10px'}}>{c.content}</td>
                      <td style={{padding: '10px'}}>{c.kwp}</td>
                      <td style={{padding: '10px'}}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '12px', fontSize: '0.85em',
                          backgroundColor: c.status === 'approved' ? 'rgba(76,175,80,0.2)' : c.status === 'rejected' ? 'rgba(244,67,54,0.2)' : 'rgba(255,193,7,0.2)',
                          color: c.status === 'approved' ? '#4caf50' : c.status === 'rejected' ? '#f44336' : '#ffc107'
                        }}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{padding: '10px'}}>
                        {c.status === 'pending' ? (
                          <div style={{display: 'flex', gap: '5px'}}>
                            <button onClick={() => handleApprove(c.id)} className="btn-primary" style={{padding: '5px 10px', fontSize: '0.8rem', width: 'auto'}}>Duyệt</button>
                            <button onClick={() => handleReject(c.id)} className="btn-danger" style={{padding: '5px 10px', fontSize: '0.8rem', width: 'auto', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s'}}>Từ chối</button>
                          </div>
                        ) : (
                          <div style={{display: 'flex', gap: '5px'}}>
                            <button onClick={() => handleUndo(c.id)} style={{padding: '5px 10px', fontSize: '0.8rem', width: 'auto', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s'}}>Hoàn tác</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {contracts.length === 0 && (
                    <tr><td colSpan="6" style={{padding: '20px', textAlign: 'center'}}>Chưa có hợp đồng nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'daily' && (
          <>
            <h2>Báo Cáo Công Việc Hàng Ngày</h2>
            <div className="glass-card">
              <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
                    <th style={{padding: '10px'}}>Ngày báo cáo</th>
                    <th style={{padding: '10px'}}>Sales</th>
                    <th style={{padding: '10px'}}>Nội dung công việc</th>
                    <th style={{padding: '10px'}}>Hình ảnh</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyReports.map(r => (
                    <tr key={r.id} style={{borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                      <td style={{padding: '10px'}}>{new Date(r.created_at + 'Z').toLocaleDateString('vi-VN')} {new Date(r.created_at + 'Z').toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
                      <td style={{padding: '10px'}}>{r.sales_name}</td>
                      <td style={{padding: '10px', whiteSpace: 'pre-wrap'}}>{r.content}</td>
                      <td style={{padding: '10px'}}>
                        {r.image_url ? (
                          <a href={getImageUrl(r.image_url)} target="_blank" rel="noreferrer">
                            <img src={getImageUrl(r.image_url)} alt="Hình ảnh" style={{maxWidth: '120px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)'}} />
                          </a>
                        ) : (
                          <span style={{opacity: 0.5}}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {dailyReports.length === 0 && (
                    <tr><td colSpan="4" style={{padding: '20px', textAlign: 'center'}}>Chưa có báo cáo nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'customers' && (
          <>
            <h2>Danh sách Khách hàng Toàn Công Ty</h2>
            <div className="glass-card">
              <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
                    <th style={{padding: '10px'}}>Khách hàng</th>
                    <th style={{padding: '10px'}}>SĐT</th>
                    <th style={{padding: '10px'}}>Địa chỉ</th>
                    <th style={{padding: '10px'}}>Phụ trách (Sales)</th>
                    <th style={{padding: '10px'}}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id} style={{borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                      <td style={{padding: '10px'}}>{c.name}</td>
                      <td style={{padding: '10px'}}>{c.phone}</td>
                      <td style={{padding: '10px'}}>{c.address || '-'}</td>
                      <td style={{padding: '10px'}}>{c.sales_name}</td>
                      <td style={{padding: '10px'}}>{c.status}</td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr><td colSpan="5" style={{padding: '20px', textAlign: 'center'}}>Chưa có khách hàng.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'salary' && (
          <>
            <h2>Tổng quan Lương (Tháng {new Date().toLocaleDateString('en-GB', {month: '2-digit', year: 'numeric'})})</h2>
            <div className="glass-card">
              <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
                    <th style={{padding: '10px'}}>Nhân viên</th>
                    <th style={{padding: '10px'}}>Lương cứng</th>
                    <th style={{padding: '10px'}}>Hoa hồng (HĐ đã duyệt)</th>
                    <th style={{padding: '10px'}}>Tổng lương tạm tính</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.map(s => {
                    const userContracts = approvedContracts.filter(c => c.sales_id === s.user_id)
                    return (
                      <Fragment key={s.user_id}>
                        <tr style={{borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                          <td style={{padding: '10px', verticalAlign: 'top', paddingTop: '15px'}}>{s.full_name}</td>
                          <td style={{padding: '10px', verticalAlign: 'top', paddingTop: '15px'}}>{formatCurrency(s.base_salary)}</td>
                          <td style={{padding: '10px', verticalAlign: 'top', paddingTop: '15px'}}>{formatCurrency(s.commission)}
                            {userContracts.length > 0 && (
                              <div className="sub-table" style={{marginTop: '10px'}}>
                                <table style={{width: '100%', borderCollapse: 'collapse', background: 'transparent'}}>
                                  <thead>
                                    <tr>
                                      <th style={{textAlign: 'left'}}>Khách hàng / Nội dung</th>
                                      <th style={{textAlign: 'right'}}>Công suất</th>
                                      <th style={{textAlign: 'right'}}>Hoa hồng</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {userContracts.map(contract => (
                                      <tr key={contract.id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                                        <td style={{maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={contract.content}>
                                          {contract.content.split('\n')[0]}
                                        </td>
                                        <td style={{textAlign: 'right'}}>{contract.kwp} kWp</td>
                                        <td className="glow-text-gold" style={{textAlign: 'right', fontWeight: 'bold'}}>
                                          {formatCurrency(contract.kwp * 200000)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                          <td className="glow-text-gold" style={{padding: '10px', fontWeight: 'bold', verticalAlign: 'top', paddingTop: '15px', fontSize: '1.2em'}}>{formatCurrency(s.total_salary)}</td>
                        </tr>
                      </Fragment>
                    )
                  })}
                  {salaryData.length === 0 && (
                    <tr><td colSpan="4" style={{padding: '20px', textAlign: 'center'}}>Không có dữ liệu.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
