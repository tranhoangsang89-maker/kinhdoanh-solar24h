import { useState, useEffect } from 'react'
import imageCompression from 'browser-image-compression'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}/static/${url.replace(/\\/g, '/')}`;
};

export default function SalesDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('daily')
  
  // Daily Report Form
  const [dailyContent, setDailyContent] = useState('')
  const [dailyImage, setDailyImage] = useState(null)
  
  // Contract Form
  const [contractContent, setContractContent] = useState('')
  const [kwp, setKwp] = useState('')
  const [contractCustomerId, setContractCustomerId] = useState('')

  // Customers
  const [customers, setCustomers] = useState([])
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [custAddress, setCustAddress] = useState('')
  const [custNote, setCustNote] = useState('')
  const [custStatus, setCustStatus] = useState('Mới')

  // Salary
  const [mySalary, setMySalary] = useState(null)
  const [approvedContracts, setApprovedContracts] = useState([])

  useEffect(() => {
    if (activeTab === 'customers' || activeTab === 'contract') {
      fetchCustomers()
    } else if (activeTab === 'kpi') {
      fetchSalary()
    }
  }, [activeTab])

  const fetchCustomers = () => {
    fetch(`${API_URL}/customers?sales_id=${user.id}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setCustomers(data))
  }

  const fetchSalary = () => {
    const month = new Date().toLocaleDateString('en-GB', {month: '2-digit', year: 'numeric'})
    fetch(`${API_URL}/admin/salary-stats?month=${month}`)
      .then(res => res.json())
      .then(data => {
        const mine = data.find(s => s.user_id === user.id)
        if (mine) setMySalary(mine)
      })
      
    // Lấy chi tiết các hợp đồng đã duyệt để hiển thị bảng hoa hồng
    fetch(`${API_URL}/reports?sales_id=${user.id}&report_type=contract&status=approved`)
      .then(res => res.json())
      .then(data => {
         const filtered = data.filter(r => {
             const reportDate = new Date(r.created_at + 'Z')
             // Đảm bảo lấy đúng tháng/năm
             const m = String(reportDate.getMonth() + 1).padStart(2, '0')
             const y = reportDate.getFullYear()
             return `${m}/${y}` === month
         })
         setApprovedContracts(filtered)
      })
  }

  const submitDailyReport = async (e) => {
    e.preventDefault()
    if (!dailyContent.trim()) return

    let imageUrl = null;
    if (dailyImage) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true
        }
        const compressedFile = await imageCompression(dailyImage, options);
        const formData = new FormData();
        formData.append("file", compressedFile);
        
        const res = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        imageUrl = data.url;
      } catch (err) {
        console.error(err);
        alert("Lỗi upload ảnh");
        return;
      }
    }

    fetch(`${API_URL}/reports?sales_id=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_type: 'daily_report',
        content: dailyContent,
        kwp: null,
        image_url: imageUrl
      })
    }).then(() => {
      alert('Đã gửi báo cáo ngày thành công!')
      setDailyContent('')
      setDailyImage(null)
      // reset file input
      document.getElementById('daily-image-input').value = '';
    })
  }

  const submitContract = (e) => {
    e.preventDefault()
    if (!contractContent.trim() || !kwp || !contractCustomerId) {
      alert("Vui lòng nhập đầy đủ thông tin hợp đồng và chọn khách hàng!");
      return;
    }

    const selectedCustomer = customers.find(c => c.id == contractCustomerId);
    const finalContent = `Khách hàng: ${selectedCustomer.name} (${selectedCustomer.phone})\nNội dung: ${contractContent}`;

    fetch(`${API_URL}/reports?sales_id=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_type: 'contract',
        content: finalContent,
        kwp: parseFloat(kwp)
      })
    }).then(() => {
      // Cập nhật trạng thái khách hàng thành Hoàn Thành
      return fetch(`${API_URL}/customers/${contractCustomerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Hoàn Thành' })
      });
    }).then(() => {
      alert('Đã nộp hợp đồng chờ duyệt và tự động chuyển khách hàng sang trạng thái Hoàn Thành!');
      setContractContent('')
      setKwp('')
      setContractCustomerId('')
      fetchCustomers();
    }).catch(err => {
      alert('Có lỗi xảy ra, vui lòng thử lại.');
      console.error(err);
    })
  }

  const submitCustomer = (e) => {
    e.preventDefault()
    if (!custName.trim() || !custPhone.trim()) return
    fetch(`${API_URL}/customers?sales_id=${user.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: custName,
        phone: custPhone,
        address: custAddress,
        note: custNote,
        status: custStatus
      })
    }).then(() => {
      alert('Đã thêm khách hàng thành công!')
      setCustName('')
      setCustPhone('')
      setCustAddress('')
      setCustNote('')
      setCustStatus('Mới')
      fetchCustomers()
    })
  }

  const updateCustomerStatus = (customerId, newStatus) => {
    // Cập nhật giao diện ngay lập tức (optimistic update)
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, status: newStatus } : c));

    fetch(`${API_URL}/customers/${customerId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).then(() => {
      alert('Đã cập nhật trạng thái khách hàng thành công!');
      fetchCustomers();
    }).catch(() => {
      alert('Có lỗi xảy ra, vui lòng thử lại.');
      fetchCustomers(); // rollback if error
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
          <h3>{user.full_name || user.username}</h3>
        </div>
        <nav>
          <button className={activeTab === 'daily' ? 'active' : ''} onClick={() => setActiveTab('daily')}>Báo cáo công việc</button>
          <button className={activeTab === 'customers' ? 'active' : ''} onClick={() => setActiveTab('customers')}>Khách hàng của tôi</button>
          <button className={activeTab === 'contract' ? 'active' : ''} onClick={() => setActiveTab('contract')}>Nộp HĐ duyệt thưởng</button>
          <button className={activeTab === 'kpi' ? 'active' : ''} onClick={() => setActiveTab('kpi')}>KPI & Lương</button>
        </nav>
        <button className="logout-btn" onClick={onLogout}>Đăng xuất</button>
      </div>
      
      <div className="main-content">
        
        {activeTab === 'daily' && (
          <>
            <h2>Báo cáo Công việc Hàng ngày</h2>
            <div className="glass-card" style={{maxWidth: '600px'}}>
              <form onSubmit={submitDailyReport} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '5px'}}>Nội dung công việc hôm nay:</label>
                  <textarea 
                    rows="5"
                    value={dailyContent}
                    onChange={(e) => setDailyContent(e.target.value)}
                    placeholder="- Đi gặp khách hàng A...&#10;- Báo giá cho khách B..."
                    required
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px'}}>Hình ảnh đính kèm:</label>
                  <input 
                    id="daily-image-input"
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setDailyImage(e.target.files[0])} 
                  />
                </div>
                <button type="submit" className="login-btn" style={{width: 'auto', alignSelf: 'flex-start'}}>Gửi Báo Cáo</button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'customers' && (
          <>
            <h2>Khách Hàng Của Tôi</h2>
            <div className="grid-2">
              <div className="glass-card">
                <h3>Thêm Khách Hàng Mới</h3>
                <form onSubmit={submitCustomer} className="customer-form" style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                  <input type="text" placeholder="Tên khách hàng *" value={custName} onChange={e => setCustName(e.target.value)} required />
                  <input type="text" placeholder="Số điện thoại *" value={custPhone} onChange={e => setCustPhone(e.target.value)} required />
                  <input type="text" placeholder="Địa chỉ" value={custAddress} onChange={e => setCustAddress(e.target.value)} />
                  <textarea placeholder="Ghi chú (nhu cầu...)" value={custNote} onChange={e => setCustNote(e.target.value)} rows="3" />
                  <select value={custStatus} onChange={e => setCustStatus(e.target.value)}>
                    <option value="Mới">Mới</option>
                    <option value="Đã Tư Vấn">Đã Tư Vấn</option>
                    <option value="Tiềm Năng">Tiềm Năng</option>
                    <option value="Khách Hàng Hot">Khách Hàng Hot</option>
                    <option value="Khách Hàng Đang Suy Nghĩ">Khách Hàng Đang Suy Nghĩ</option>
                    <option value="Rớt Khách">Rớt Khách</option>
                    <option value="Hoàn Thành">Hoàn Thành</option>
                  </select>
                  <button type="submit" className="btn-primary" style={{marginTop: '10px'}}>Thêm Khách Hàng</button>
                </form>
              </div>

              <div className="glass-card">
                <h3>Danh sách ({customers.length})</h3>
                <ul style={{listStyle: 'none', padding: 0, maxHeight: '400px', overflowY: 'auto'}}>
                  {customers.map(c => (
                    <li key={c.id} style={{padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
                      <div style={{fontWeight: 'bold'}}>{c.name} - {c.phone}</div>
                      <div style={{fontSize: '0.9em', opacity: 0.8}}>{c.address}</div>
                      <div style={{marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <span style={{fontSize: '0.85em', color: 'var(--gold-accent)'}}>Trạng thái:</span>
                          <select 
                            value={c.status === 'new' ? 'Mới' : c.status === 'warm' ? 'Tiềm Năng' : c.status === 'hot' ? 'Khách Hàng Hot' : c.status === 'pending' ? 'Khách Hàng Đang Suy Nghĩ' : c.status === 'lost' ? 'Rớt Khách' : c.status} 
                            onChange={(e) => updateCustomerStatus(c.id, e.target.value)}
                            style={{padding: '4px 8px', width: 'auto'}}
                          >
                            <option value="Mới">Mới</option>
                            <option value="Đã Tư Vấn">Đã Tư Vấn</option>
                            <option value="Tiềm Năng">Tiềm Năng</option>
                            <option value="Khách Hàng Hot">Khách Hàng Hot</option>
                            <option value="Khách Hàng Đang Suy Nghĩ">Khách Hàng Đang Suy Nghĩ</option>
                            <option value="Rớt Khách">Rớt Khách</option>
                            <option value="Hoàn Thành">Hoàn Thành</option>
                          </select>
                      </div>
                    </li>
                  ))}
                  {customers.length === 0 && <p>Chưa có khách hàng nào.</p>}
                </ul>
              </div>
            </div>
          </>
        )}

        {activeTab === 'contract' && (
          <>
            <h2>Nộp Hợp Đồng Duyệt Thưởng</h2>
            <div className="glass-card" style={{maxWidth: '600px'}}>
              <form onSubmit={submitContract} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '5px'}}>Chọn khách hàng:</label>
                  <select
                    value={contractCustomerId}
                    onChange={(e) => setContractCustomerId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px'}}>Thông tin hợp đồng (Ghi chú thêm...):</label>
                  <textarea 
                    rows="3"
                    value={contractContent}
                    onChange={(e) => setContractContent(e.target.value)}
                    placeholder="Hợp đồng lắp đặt cho chú Minh - Q2..."
                    required
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px'}}>Công suất lắp đặt (kWp):</label>
                  <input 
                    type="number" step="0.01" min="0"
                    value={kwp}
                    onChange={(e) => setKwp(e.target.value)}
                    placeholder="Ví dụ: 5.5"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{width: 'auto', alignSelf: 'flex-start'}}>Gửi Admin Duyệt</button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'kpi' && (
          <>
            <h2>KPI & Lương Tạm Tính (Tháng {new Date().toLocaleDateString('en-GB', {month: '2-digit', year: 'numeric'})})</h2>
            <div className="glass-card" style={{maxWidth: '600px'}}>
              {mySalary ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '1.1em'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span>Lương cứng:</span>
                    <strong>{formatCurrency(mySalary.base_salary)}</strong>
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span>Hoa hồng (HĐ đã duyệt):</span>
                    <strong>{formatCurrency(mySalary.commission)}</strong>
                  </div>
                  
                  {/* Bảng chi tiết hoa hồng */}
                  {approvedContracts && approvedContracts.length > 0 && (
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
                          {approvedContracts.map(contract => (
                            <tr key={contract.id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                              <td style={{maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={contract.content}>
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

                  <hr style={{borderColor: 'var(--border-color)', margin: '20px 0'}} />
                  
                  <div className="salary-total-card">
                    <p style={{margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9em', opacity: 0.8}}>Tổng Thu Nhập Tháng Này</p>
                    <h2 className="glow-text-gold" style={{fontSize: '2.5rem', margin: 0}}>{formatCurrency(mySalary.total_salary)}</h2>
                  </div>
                </div>
              ) : (
                <p>Đang tải dữ liệu...</p>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
