import { useState, useEffect } from 'react'
import imageCompression from 'browser-image-compression'
import KanbanBoard from './components/KanbanBoard'
import { supabase } from './supabaseClient'

export default function SalesDashboard({ user, onLogout, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState('daily')
  
  // Daily Report Form
  const [dailyContent, setDailyContent] = useState('')
  const [dailyImage, setDailyImage] = useState(null)
  const [isSubmittingDaily, setIsSubmittingDaily] = useState(false)
  
  // Contract Form
  const [contractContent, setContractContent] = useState('')
  const [kwp, setKwp] = useState('')
  const [contractCustomerId, setContractCustomerId] = useState('')
  const [contractIndoorImage, setContractIndoorImage] = useState(null)
  const [contractOutdoorImage, setContractOutdoorImage] = useState(null)
  const [isSubmittingContract, setIsSubmittingContract] = useState(false)

  // Customers (for dropdown)
  const [customers, setCustomers] = useState([])

  // Salary
  const [mySalary, setMySalary] = useState(null)
  const [approvedContracts, setApprovedContracts] = useState([])
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  useEffect(() => {
    if (activeTab === 'contract') {
      fetchCustomers()
    } else if (activeTab === 'kpi') {
      fetchSalary()
    }
  }, [activeTab])

  // ... rest of fetch functions ...
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('sales_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err.message);
    }
  }

  const fetchSalary = async () => {
    try {
      // Current month bounds
      const date = new Date()
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString()
      
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('sales_id', user.id)
        .eq('status', 'approved')
        .gte('created_at', firstDay)
        .lte('created_at', lastDay)
        
      if (error) throw error;
      
      setApprovedContracts(contracts || []);
      
      const totalKwp = contracts ? contracts.reduce((acc, curr) => acc + (curr.kwp || 0), 0) : 0;
      const baseSalary = 5000000;
      const commission = totalKwp * 200000;
      
      setMySalary({
        base_salary: baseSalary,
        commission: commission,
        total_salary: baseSalary + commission
      });
      
    } catch (err) {
      console.error('Error fetching salary:', err.message);
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

  const submitDailyReport = async (e) => {
    e.preventDefault()
    if (!dailyContent.trim()) return
    setIsSubmittingDaily(true)

    try {
      let imageUrl = null;
      if (dailyImage) {
        // Compress image
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true
        }
        const compressedFile = await imageCompression(dailyImage, options);
        
        // Upload to Supabase Storage
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, compressedFile);
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }

      // Insert into daily_reports table
      const { error: insertError } = await supabase
        .from('daily_reports')
        .insert([{
          content: dailyContent,
          image_url: imageUrl,
          sales_id: user.id
        }]);

      if (insertError) throw insertError;

      alert('Đã gửi báo cáo ngày thành công!')
      setDailyContent('')
      setDailyImage(null)
      document.getElementById('daily-image-input').value = '';
    } catch (err) {
      console.error(err);
      alert("Lỗi khi gửi báo cáo: " + err.message);
    } finally {
      setIsSubmittingDaily(false)
    }
  }

  const submitContract = async (e) => {
    e.preventDefault()
    if (!contractContent.trim() || !kwp || !contractCustomerId) {
      alert("Vui lòng nhập đầy đủ thông tin hợp đồng và chọn khách hàng!");
      return;
    }
    setIsSubmittingContract(true)

    try {
      const selectedCustomer = customers.find(c => c.id === contractCustomerId);
      const finalContent = `Khách hàng: ${selectedCustomer.customer_name} (${selectedCustomer.phone})\nNội dung: ${contractContent}`;

      let indoorUrl = null;
      let outdoorUrl = null;
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };

      if (contractIndoorImage) {
        const compressedFile = await imageCompression(contractIndoorImage, options);
        const fileName = `indoor_${user.id}_${Math.random()}.${compressedFile.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('images').upload(fileName, compressedFile);
        if (!error) indoorUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
      }
      
      if (contractOutdoorImage) {
        const compressedFile = await imageCompression(contractOutdoorImage, options);
        const fileName = `outdoor_${user.id}_${Math.random()}.${compressedFile.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('images').upload(fileName, compressedFile);
        if (!error) outdoorUrl = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
      }

      // Insert into contracts
      const { error: insertError } = await supabase
        .from('contracts')
        .insert([{
          lead_id: contractCustomerId,
          sales_id: user.id,
          content: finalContent,
          kwp: parseFloat(kwp),
          indoor_photo_url: indoorUrl,
          outdoor_photo_url: outdoorUrl,
          status: 'pending'
        }]);
        
      if (insertError) throw insertError;

      // Update lead status to 'Chốt Deal'
      const { error: updateError } = await supabase
        .from('leads')
        .update({ status: 'Chốt Deal' })
        .eq('id', contractCustomerId);
        
      if (updateError) throw updateError;

      alert('Đã nộp hợp đồng chờ duyệt và tự động chuyển khách hàng sang trạng thái Chốt Deal!');
      setContractContent('')
      setKwp('')
      setContractCustomerId('')
      setContractIndoorImage(null)
      setContractOutdoorImage(null)
      document.getElementById('indoor-image-input').value = '';
      document.getElementById('outdoor-image-input').value = '';
      fetchCustomers();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra: ' + err.message);
    } finally {
      setIsSubmittingContract(false)
    }
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
               <img src={`https://ui-avatars.com/api/?name=${user.full_name || 'Sales'}&background=random`} alt="Avatar" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
            )}
          </label>
          <h3 onClick={handleChangeName} style={{ cursor: 'pointer' }} title="Nhấn để đổi tên">
            {user.full_name || user.username} ✏️
          </h3>
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
          <KanbanBoard user={user} />
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
                      <option key={c.id} value={c.id}>{c.customer_name} - {c.phone}</option>
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
                <div>
                  <label style={{display: 'block', marginBottom: '5px'}}>Ảnh thi công Indoor (Tủ điện/Inverter):</label>
                  <input 
                    id="indoor-image-input"
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setContractIndoorImage(e.target.files[0])} 
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px'}}>Ảnh thi công Outdoor (Tấm pin/Mái nhà):</label>
                  <input 
                    id="outdoor-image-input"
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setContractOutdoorImage(e.target.files[0])} 
                  />
                </div>
                <button type="submit" className="btn-primary" style={{width: 'auto', alignSelf: 'flex-start'}} disabled={isSubmittingContract}>
                  {isSubmittingContract ? 'Đang gửi...' : 'Gửi Admin Duyệt'}
                </button>
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
