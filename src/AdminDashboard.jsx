import { useState, useEffect, Fragment } from 'react'
import { supabase } from './supabaseClient'
import imageCompression from 'browser-image-compression'
import KanbanBoard from './components/KanbanBoard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export default function AdminDashboard({ user, onLogout, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('kpi')
  
  // KPI Stats
  const [stats, setStats] = useState(null)
  
  // Contracts
  const [contracts, setContracts] = useState([])
  const [approvedContracts, setApprovedContracts] = useState([])
  
  // Customers
  const [customers, setCustomers] = useState([])
  const [salesList, setSalesList] = useState([])
  const [customerViewType, setCustomerViewType] = useState('table') // 'table' | 'board'
  const [showAddLead, setShowAddLead] = useState(false)
  const [newLead, setNewLead] = useState({ customer_name: '', phone: '', address: '', sales_id: '' })
  
  // Daily Reports
  const [dailyReports, setDailyReports] = useState([])
  
  // Salary
  const [salaryData, setSalaryData] = useState([])
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1)
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear())

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  useEffect(() => {
    if (activeTab === 'kpi') {
      fetchKpiStats()
    } else if (activeTab === 'contracts') {
      fetchContracts()
    } else if (activeTab === 'customers') {
      fetchCustomers()
    } else if (activeTab === 'daily') {
      fetchDailyReports()
    } else if (activeTab === 'salary') {
      fetchSalary()
    }
  }, [activeTab, salaryMonth, salaryYear])

  const fetchKpiStats = async () => {
    try {
      const { count: customerCount } = await supabase.from('leads').select('*', { count: 'exact', head: true })
      const { count: contractCount } = await supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'approved')
      
      const { data: approvedData } = await supabase.from('contracts').select('kwp, created_at').eq('status', 'approved')
      const totalKwp = approvedData ? approvedData.reduce((acc, curr) => acc + (curr.kwp || 0), 0) : 0
      
      const { data: leadsData } = await supabase.from('leads').select('status')
      const statusCount = { 'Mới': 0, 'Khảo sát': 0, 'Báo giá': 0, 'Chốt Deal': 0, 'Rớt Khách': 0 }
      leadsData?.forEach(l => {
         if (statusCount[l.status] !== undefined) statusCount[l.status]++
      })
      const pieData = Object.keys(statusCount).map(k => ({ name: k, value: statusCount[k] }))
      
      const monthlyData = {}
      approvedData?.forEach(c => {
         const d = new Date(c.created_at)
         const m = d.getMonth() + 1
         const y = d.getFullYear()
         const key = `T${m}/${y}`
         if (!monthlyData[key]) monthlyData[key] = 0
         monthlyData[key] += (c.kwp || 0)
      })
      const barData = Object.keys(monthlyData).map(k => ({ name: k, kwp: monthlyData[k] }))
      
      setStats({
        total_customers: customerCount || 0,
        total_contracts: contractCount || 0,
        total_kwp: totalKwp,
        pieData,
        barData
      })
    } catch (err) {
      console.error(err)
    }
  }

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          profiles (full_name),
          leads (customer_name)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error;
      
      const formatted = data.map(c => ({
        id: c.id,
        sales_name: c.profiles?.full_name || 'N/A',
        content: c.content,
        kwp: c.kwp,
        status: c.status,
        created_at: c.created_at,
        lead_id: c.lead_id,
        indoor_photo_url: c.indoor_photo_url,
        outdoor_photo_url: c.outdoor_photo_url
      }))
      setContracts(formatted)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchCustomers = async () => {
    try {
      const { data: salesData } = await supabase.from('profiles').select('id, full_name').eq('role', 'sales')
      setSalesList(salesData || [])

      const { data, error } = await supabase
        .from('leads')
        .select(`id, customer_name, phone, address, status, sales_id`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const formatted = data.map(lead => {
        const sales = (salesData || []).find(s => s.id === lead.sales_id);
        return {
          id: lead.id,
          name: lead.customer_name,
          phone: lead.phone,
          address: lead.address,
          sales_id: lead.sales_id,
          sales_name: sales ? sales.full_name : 'Chưa phân công',
          status: lead.status
        };
      });
      setCustomers(formatted);
    } catch (err) {
      console.error("Error fetching customers:", err.message);
    }
  }

  const fetchDailyReports = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const formatted = data.map(r => ({
        id: r.id,
        sales_name: r.profiles?.full_name || 'N/A',
        content: r.content,
        image_url: r.image_url,
        created_at: r.created_at
      }))
      setDailyReports(formatted)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSalary = async () => {
    try {
      const firstDay = new Date(salaryYear, salaryMonth - 1, 1).toISOString()
      const lastDay = new Date(salaryYear, salaryMonth, 0).toISOString()
      
      // 1. Fetch all sales profiles
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'sales')
        
      if (profileErr) throw profileErr;
      
      // 2. Fetch approved contracts for this month
      const { data: monthContracts, error: contractErr } = await supabase
        .from('contracts')
        .select('*')
        .eq('status', 'approved')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay)
        
      if (contractErr) throw contractErr;
      
      setApprovedContracts(monthContracts || [])
      
      // 3. Calculate salary for each sales
      const calculatedData = profiles.map(profile => {
        const userContracts = (monthContracts || []).filter(c => c.sales_id === profile.id)
        const totalKwp = userContracts.reduce((sum, c) => sum + (c.kwp || 0), 0)
        
        const base_salary = 5000000
        const commission = totalKwp * 200000
        
        return {
          user_id: profile.id,
          full_name: profile.full_name || 'Sales',
          base_salary,
          commission,
          total_salary: base_salary + commission
        }
      })
      
      setSalaryData(calculatedData)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateProfile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUpdatingProfile(true)
    try {
      // Compress image
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true }
      const compressedFile = await imageCompression(file, options)
      
      const fileExt = compressedFile.name.split('.').pop()
      const fileName = `avatar_${user.id}_${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      // Upload to images bucket
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, compressedFile)
        
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)
        
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        
      if (updateError) throw updateError
      
      onUpdateUser({ avatar_url: publicUrl })
      alert('Đã cập nhật ảnh đại diện!')
    } catch (err) {
      console.error(err)
      alert('Lỗi cập nhật ảnh đại diện: ' + err.message)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangeName = async () => {
    const newName = window.prompt("Nhập tên hiển thị mới:", user.full_name || "")
    if (newName && newName.trim() !== "") {
      try {
        const { error } = await supabase.from('profiles').update({ full_name: newName }).eq('id', user.id)
        if (error) throw error
        onUpdateUser({ full_name: newName })
      } catch (err) {
        console.error(err)
        alert('Lỗi đổi tên: ' + err.message)
      }
    }
  }

  const handleApprove = async (id, leadId) => {
    try {
      await supabase.from('contracts').update({ status: 'approved' }).eq('id', id)
      if (leadId) {
        await supabase.from('leads').update({ status: 'Chốt Deal' }).eq('id', leadId)
      }
      setContracts(contracts.map(c => c.id === id ? { ...c, status: 'approved' } : c))
    } catch (err) {
      console.error(err)
    }
  }

  const handleReject = async (id) => {
    try {
      await supabase.from('contracts').update({ status: 'rejected' }).eq('id', id)
      setContracts(contracts.map(c => c.id === id ? { ...c, status: 'rejected' } : c))
    } catch (err) {
      console.error(err)
    }
  }

  const handleUndo = async (id) => {
    try {
      await supabase.from('contracts').update({ status: 'pending' }).eq('id', id)
      setContracts(contracts.map(c => c.id === id ? { ...c, status: 'pending' } : c))
    } catch (err) {
      console.error(err)
    }
  }

  const handleAssignLead = async (leadId, salesId) => {
    if (!salesId) return;
    try {
      const { error } = await supabase.from('leads').update({ sales_id: salesId }).eq('id', leadId)
      if (error) throw error
      const salesName = salesList.find(s => s.id === salesId)?.full_name || 'Chưa phân công'
      setCustomers(customers.map(c => c.id === leadId ? { ...c, sales_name: salesName, sales_id: salesId } : c))
      alert('Đã phân công khách hàng thành công!')
    } catch (err) {
      console.error(err)
      alert('Lỗi phân công: ' + err.message)
    }
  }

  const handleAddLead = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('leads').insert([{
        customer_name: newLead.customer_name,
        phone: newLead.phone,
        address: newLead.address,
        sales_id: newLead.sales_id || null,
        status: 'Mới'
      }])
      if (error) throw error
      alert('Thêm khách hàng thành công!')
      setShowAddLead(false)
      setNewLead({ customer_name: '', phone: '', address: '', sales_id: '' })
      fetchCustomers()
    } catch (err) {
      console.error(err)
      alert('Lỗi thêm khách hàng: ' + err.message)
    }
  }

  const exportSalaryPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text(`BAO CAO LUONG - THANG ${salaryMonth}/${salaryYear}`, 14, 22)
    
    const tableColumn = ["Nhan vien", "Luong cung (VND)", "Hoa hong (VND)", "Tong luong (VND)"]
    const tableRows = []

    salaryData.forEach(s => {
      const rowData = [
        s.full_name,
        new Intl.NumberFormat('vi-VN').format(s.base_salary),
        new Intl.NumberFormat('vi-VN').format(s.commission),
        new Intl.NumberFormat('vi-VN').format(s.total_salary)
      ]
      tableRows.push(rowData)
    })

    doc.autoTable({
      startY: 30,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233] }
    })
    
    doc.save(`Bao_Cao_Luong_T${salaryMonth}_${salaryYear}.pdf`)
  }

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="user-info" style={{ position: 'relative' }}>
          {isUpdatingProfile && <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', width: '100px', height: '100px', margin: '0 auto', zIndex: 10}}><small>Đang tải...</small></div>}
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpdateProfile} />
            {user.avatar_url ? (
               <img src={user.avatar_url} alt="Avatar" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-color)' }} />
            ) : (
               <img src={`https://ui-avatars.com/api/?name=${user.full_name || 'Admin'}&background=random`} alt="Avatar" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
            )}
          </label>
          <h3 onClick={handleChangeName} style={{ cursor: 'pointer' }} title="Nhấn để đổi tên">
            {user.full_name || 'ADMIN'} ✏️
          </h3>
        </div>
        <nav>
          <button className={activeTab === 'kpi' ? 'active' : ''} onClick={() => setActiveTab('kpi')}>Tổng quan KPI</button>
          <button className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}>Báo cáo hàng ngày</button>
          <button className={activeTab === 'customers' ? 'active' : ''} onClick={() => setActiveTab('customers')}>Danh sách khách hàng</button>
          <button className={activeTab === 'contracts' ? 'active' : ''} onClick={() => setActiveTab('contracts')}>Duyệt hợp đồng</button>
          <button className={activeTab === 'salary' ? 'active' : ''} onClick={() => setActiveTab('salary')}>Tổng quan lương</button>
          <button className={activeTab === 'completed' ? 'active' : ''} onClick={() => setActiveTab('completed')}>Khách đã lắp đặt</button>
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
            
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div className="glass-card">
                  <h3>Tỉ Lệ Trạng Thái Khách Hàng (Phễu)</h3>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={stats.pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="glass-card">
                  <h3>Tổng kWp Lắp Đặt Theo Tháng</h3>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={stats.barData}>
                        <XAxis dataKey="name" stroke="#cbd5e1" />
                        <YAxis stroke="#cbd5e1" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.1)'}} />
                        <Bar dataKey="kwp" fill="var(--gold-accent)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
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
                    <th style={{padding: '10px'}}>Ảnh đính kèm</th>
                    <th style={{padding: '10px'}}>Trạng thái</th>
                    <th style={{padding: '10px'}}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id} style={{borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                      <td style={{padding: '10px'}}>{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                      <td style={{padding: '10px'}}>{c.sales_name}</td>
                      <td style={{padding: '10px'}}>{c.content}</td>
                      <td style={{padding: '10px'}}>{c.kwp}</td>
                      <td style={{padding: '10px'}}>
                        <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                          {c.indoor_photo_url && (
                            <a href={c.indoor_photo_url} target="_blank" rel="noreferrer">
                              <img src={c.indoor_photo_url} alt="Indoor" style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)'}} title="Ảnh Indoor" />
                            </a>
                          )}
                          {c.outdoor_photo_url && (
                            <a href={c.outdoor_photo_url} target="_blank" rel="noreferrer">
                              <img src={c.outdoor_photo_url} alt="Outdoor" style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)'}} title="Ảnh Outdoor" />
                            </a>
                          )}
                          {!c.indoor_photo_url && !c.outdoor_photo_url && (
                            <span style={{opacity: 0.5, fontSize: '0.9em'}}>-</span>
                          )}
                        </div>
                      </td>
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
                            <button onClick={() => handleApprove(c.id, c.lead_id)} className="btn-primary" style={{padding: '5px 10px', fontSize: '0.8rem', width: 'auto'}}>Duyệt</button>
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
                    <tr><td colSpan="7" style={{padding: '20px', textAlign: 'center'}}>Chưa có hợp đồng nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'completed' && (
          <>
            <h2>Khách Hàng Đã Hoàn Thành Lắp Đặt</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {contracts.filter(c => c.status === 'approved').map(c => (
                <div key={c.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, color: 'var(--gold-accent)' }}>{c.content.split('\n')[0].replace('Khách hàng: ', '')}</h3>
                    <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8em' }}>Đã lắp đặt</span>
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#cbd5e1' }}>
                    <div><strong>Sales:</strong> {c.sales_name}</div>
                    <div><strong>Hệ thống:</strong> {c.kwp} kWp</div>
                    <div><strong>Ngày duyệt:</strong> {new Date(c.created_at).toLocaleDateString('vi-VN')}</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.85em', opacity: 0.8 }}>Ảnh Indoor</p>
                      {c.indoor_photo_url ? (
                        <a href={c.indoor_photo_url} target="_blank" rel="noreferrer">
                          <img src={c.indoor_photo_url} alt="Indoor" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </a>
                      ) : (
                        <div style={{ width: '100%', height: '150px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>Chưa cập nhật</div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.85em', opacity: 0.8 }}>Ảnh Outdoor</p>
                      {c.outdoor_photo_url ? (
                        <a href={c.outdoor_photo_url} target="_blank" rel="noreferrer">
                          <img src={c.outdoor_photo_url} alt="Outdoor" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </a>
                      ) : (
                        <div style={{ width: '100%', height: '150px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>Chưa cập nhật</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {contracts.filter(c => c.status === 'approved').length === 0 && (
                <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                  Chưa có công trình nào được duyệt.
                </div>
              )}
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
                      <td style={{padding: '10px'}}>{new Date(r.created_at).toLocaleDateString('vi-VN')} {new Date(r.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</td>
                      <td style={{padding: '10px'}}>{r.sales_name}</td>
                      <td style={{padding: '10px', whiteSpace: 'pre-wrap'}}>{r.content}</td>
                      <td style={{padding: '10px'}}>
                        {r.image_url ? (
                          <a href={r.image_url} target="_blank" rel="noreferrer">
                            <img src={r.image_url} alt="Hình ảnh" style={{maxWidth: '120px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)'}} />
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
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
              <h2>Danh sách Khách hàng Toàn Công Ty</h2>
              <div style={{display: 'flex', gap: '10px'}}>
                <button 
                  className="btn-primary"
                  onClick={() => setShowAddLead(!showAddLead)}
                  style={{padding: '5px 15px', fontSize: '0.9em', background: '#10b981'}}
                >
                  {showAddLead ? '✕ Đóng' : '➕ Thêm Mới'}
                </button>
                <button 
                  className={customerViewType === 'table' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setCustomerViewType('table')}
                  style={{padding: '5px 15px', fontSize: '0.9em'}}
                >
                  Dạng Bảng
                </button>
                <button 
                  className={customerViewType === 'board' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setCustomerViewType('board')}
                  style={{padding: '5px 15px', fontSize: '0.9em'}}
                >
                  Phễu Kanban
                </button>
              </div>
            </div>
            
            {showAddLead && (
              <div className="glass-card" style={{marginBottom: '20px', border: '1px solid #10b981'}}>
                <h3>Nhập Thông Tin Khách Hàng Mới</h3>
                <form onSubmit={handleAddLead} style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                  <input type="text" placeholder="Tên khách hàng *" value={newLead.customer_name} onChange={e => setNewLead({...newLead, customer_name: e.target.value})} className="glass-input" required />
                  <input type="text" placeholder="Số điện thoại *" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} className="glass-input" required />
                  <input type="text" placeholder="Địa chỉ (Quận, Tỉnh)" value={newLead.address} onChange={e => setNewLead({...newLead, address: e.target.value})} className="glass-input" />
                  <select value={newLead.sales_id} onChange={e => setNewLead({...newLead, sales_id: e.target.value})} className="glass-input">
                    <option value="">-- Chọn Sales Phụ Trách (Hoặc để trống) --</option>
                    {salesList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                  <button type="submit" className="btn-primary" style={{gridColumn: '1 / -1', background: '#10b981', border: 'none'}}>Lưu Khách Hàng</button>
                </form>
              </div>
            )}
            
            {customerViewType === 'table' ? (
              <div className="glass-card">
                <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
                      <th style={{padding: '10px'}}>Khách hàng</th>
                      <th style={{padding: '10px'}}>SĐT</th>
                      <th style={{padding: '10px'}}>Địa chỉ</th>
                      <th style={{padding: '10px'}}>Phụ trách (Sales)</th>
                      <th style={{padding: '10px'}}>Trạng thái</th>
                      <th style={{padding: '10px'}}>Phân công</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c.id} style={{borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                        <td style={{padding: '10px'}}>{c.name}</td>
                        <td style={{padding: '10px'}}>{c.phone}</td>
                        <td style={{padding: '10px'}}>{c.address || '-'}</td>
                        <td style={{padding: '10px'}}>{c.sales_name}</td>
                        <td style={{padding: '10px'}}>
                          <span style={{padding: '4px 8px', borderRadius: '12px', fontSize: '0.85em', background: 'rgba(255,255,255,0.1)'}}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{padding: '10px'}}>
                          <select 
                            value={c.sales_id || ''} 
                            onChange={(e) => handleAssignLead(c.id, e.target.value)}
                            style={{padding: '5px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'inherit'}}
                          >
                            <option value="">-- Chọn Sales --</option>
                            {salesList.map(s => (
                              <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr><td colSpan="6" style={{padding: '20px', textAlign: 'center'}}>Chưa có khách hàng.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <KanbanBoard user={user} isAdminView={true} />
            )}
          </>
        )}

        {activeTab === 'salary' && (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2>Tổng quan Lương</h2>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <button onClick={exportSalaryPDF} className="btn-primary" style={{padding: '8px 15px', fontSize: '0.9em'}}>
                  📄 Xuất PDF
                </button>
                <select value={salaryMonth} onChange={(e) => setSalaryMonth(Number(e.target.value))} className="glass-input" style={{padding: '8px 12px'}}>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
                <select value={salaryYear} onChange={(e) => setSalaryYear(Number(e.target.value))} className="glass-input" style={{padding: '8px 12px'}}>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginTop: '20px' }}>
              {salaryData.map(s => {
                const userContracts = approvedContracts.filter(c => c.sales_id === s.user_id)
                return (
                  <div key={s.user_id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                      <h3 style={{ margin: 0, color: 'var(--gold-accent)' }}>{s.full_name}</h3>
                      <span className="glow-text-gold" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{formatCurrency(s.total_salary)}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em' }}>
                      <span style={{ color: '#cbd5e1' }}>Lương cứng:</span>
                      <strong>{formatCurrency(s.base_salary)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em' }}>
                      <span style={{ color: '#cbd5e1' }}>Tổng Hoa hồng:</span>
                      <strong>{formatCurrency(s.commission)}</strong>
                    </div>

                    {userContracts.length > 0 ? (
                      <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.85em', color: '#94a3b8', textTransform: 'uppercase' }}>Chi tiết HĐ đã duyệt ({userContracts.length})</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {userContracts.map(contract => (
                            <div key={contract.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '5px' }}>
                              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }} title={contract.content}>
                                {contract.content.split('\n')[0].replace('Khách hàng: ', '')}
                              </span>
                              <span style={{ fontWeight: 'bold', color: '#10b981' }}>+{formatCurrency(contract.kwp * 200000)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center', opacity: 0.5, fontSize: '0.85em' }}>
                        Chưa có hợp đồng nào
                      </div>
                    )}
                  </div>
                )
              })}
              {salaryData.length === 0 && (
                <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                  Không có dữ liệu nhân viên.
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
