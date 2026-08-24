import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { supabase } from '../supabaseClient';
import KanbanColumn from './KanbanColumn';
import KanbanItem from './KanbanItem';
import './KanbanBoard.css';
import { generateQuotePDF } from '../utils/pdfGenerator';

const COLUMNS = [
  { id: 'Mới', title: 'Mới' },
  { id: 'Khảo sát', title: 'Khảo sát' },
  { id: 'Báo giá', title: 'Báo giá' },
  { id: 'Chốt Deal', title: 'Chốt Deal' },
  { id: 'Rớt Khách', title: 'Rớt Khách' }
];

export default function KanbanBoard({ user, isAdminView = false }) {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custKwp, setCustKwp] = useState('');

  // Modals state
  const [surveyLead, setSurveyLead] = useState(null);
  const [surveyDate, setSurveyDate] = useState('');
  
  const [quoteLead, setQuoteLead] = useState(null);
  const [quoteInverter, setQuoteInverter] = useState('LuxPower_SNA_5000W');
  const [quoteBattery, setQuoteBattery] = useState('none');
  const [quoteKwp, setQuoteKwp] = useState('');

  const [editingLead, setEditingLead] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchLeads();
  }, [isAdminView]);

  const fetchLeads = async () => {
    try {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      
      if (!isAdminView) {
        query = query.eq('sales_id', user.id);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error.message);
    }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      const newLead = {
        customer_name: custName,
        phone: custPhone,
        address: custAddress,
        kwp: parseFloat(custKwp) || 0,
        status: 'Mới',
        sales_id: user.id
      };

      const { data, error } = await supabase
        .from('leads')
        .insert([newLead])
        .select();

      if (error) throw error;

      setItems([...items, data[0]]);
      setShowAddForm(false);
      
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setCustKwp('');
    } catch (error) {
      console.error('Error adding lead:', error.message);
      alert('Lỗi: ' + error.message);
    }
  };

  const updateLeadStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error.message);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    setItems((items) =>
      items.map((item) =>
        item.id === leadId ? { ...item, status: newStatus } : item
      )
    );
    await updateLeadStatus(leadId, newStatus);
  };

  const handleDeleteLead = async (lead) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa khách hàng "${lead.customer_name}" không? Hành động này không thể hoàn tác!`)) {
      try {
        const { error } = await supabase.from('leads').delete().eq('id', lead.id);
        if (error) throw error;
        setItems(items.filter(i => i.id !== lead.id));
      } catch (error) {
        alert('Lỗi xóa khách hàng: ' + error.message);
      }
    }
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setCustName(lead.customer_name);
    setCustPhone(lead.phone);
    setCustAddress(lead.address || '');
    setCustKwp(lead.kwp || '');
  };

  const saveEditedLead = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('leads').update({
        customer_name: custName,
        phone: custPhone,
        address: custAddress,
        kwp: parseFloat(custKwp) || 0
      }).eq('id', editingLead.id);

      if (error) throw error;

      setItems(items.map(i => i.id === editingLead.id ? {
        ...i,
        customer_name: custName,
        phone: custPhone,
        address: custAddress,
        kwp: parseFloat(custKwp) || 0
      } : i));

      setEditingLead(null);
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setCustKwp('');
    } catch (error) {
      alert('Lỗi lưu thông tin: ' + error.message);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItem = items.find((item) => item.id === active.id);
    const overId = over.id;
    
    let targetStatus = overId;
    
    if (!COLUMNS.find(c => c.id === overId)) {
      const overItem = items.find(item => item.id === overId);
      if (overItem) targetStatus = overItem.status;
    }

    if (activeItem && targetStatus && COLUMNS.find(c => c.id === targetStatus)) {
      if (activeItem.status !== targetStatus) {
        setItems((items) =>
          items.map((item) =>
            item.id === active.id ? { ...item, status: targetStatus } : item
          )
        );
        updateLeadStatus(active.id, targetStatus);
      }
    }
  };

  const saveSurveyDate = async () => {
    if (!surveyDate || !surveyLead) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update({ survey_date: surveyDate })
        .eq('id', surveyLead.id);
      if (error) throw error;
      
      setItems(items.map(item => item.id === surveyLead.id ? { ...item, survey_date: surveyDate } : item));
      setSurveyLead(null);
      setSurveyDate('');
      alert("Đã lưu lịch khảo sát!");
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateQuote = async () => {
    if (!quoteLead || !quoteKwp) {
      alert("Vui lòng nhập công suất (kWp)");
      return;
    }
    
    setIsGenerating(true);
    try {
      await generateQuotePDF(quoteLead, quoteInverter, quoteBattery, parseFloat(quoteKwp));
      
      // Also update kWp in DB if it changed
      if (parseFloat(quoteKwp) !== quoteLead.kwp) {
        supabase.from('leads').update({ kwp: parseFloat(quoteKwp) }).eq('id', quoteLead.id).then(({error}) => {
          if (!error) {
            setItems(items.map(item => item.id === quoteLead.id ? { ...item, kwp: parseFloat(quoteKwp) } : item));
          }
        });
      }
      setQuoteLead(null);
    } catch (err) {
      alert("Lỗi tạo báo giá: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadQuote = async (leadId, file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('quotes')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('quotes')
        .getPublicUrl(fileName);
        
      const publicUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase
        .from('leads')
        .update({ quote_file_url: publicUrl })
        .eq('id', leadId);

      if (dbError) throw dbError;

      setItems((prevItems) => 
        prevItems.map((item) => 
          item.id === leadId ? { ...item, quote_file_url: publicUrl } : item
        )
      );
    } catch (error) {
      console.error('Error uploading quote:', error.message);
      alert('Lỗi tải file: ' + error.message);
    }
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <div className="kanban-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>{isAdminView ? "Phễu Sales (Toàn Công Ty)" : "Pipeline Bán Hàng"}</h2>
        {!isAdminView && (
          <button className="add-lead-btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Hủy' : '+ Thêm Khách Hàng'}
          </button>
        )}
      </div>

      {showAddForm && !isAdminView && (
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={handleAddLead} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Tên khách hàng *" value={custName} onChange={e => setCustName(e.target.value)} required className="input-premium" />
            <input type="text" placeholder="Số điện thoại *" value={custPhone} onChange={e => setCustPhone(e.target.value)} required className="input-premium" />
            <input type="text" placeholder="Địa chỉ" value={custAddress} onChange={e => setCustAddress(e.target.value)} className="input-premium" />
            <input type="number" step="0.1" placeholder="Công suất dự kiến (kWp)" value={custKwp} onChange={e => setCustKwp(e.target.value)} className="input-premium" />
            <button type="submit" className="login-btn" style={{ width: 'auto', alignSelf: 'flex-start' }}>Lưu Khách Hàng</button>
          </form>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {COLUMNS.map((col) => (
            <KanbanColumn 
              key={col.id} 
              id={col.id} 
              title={col.title} 
              items={items.filter((item) => item.status === col.id)}
              onSurveyClick={(item) => setSurveyLead(item)}
              onQuoteClick={(item) => {
                setQuoteLead(item);
                setQuoteKwp(item.kwp || '');
              }}
              onUploadQuote={handleUploadQuote}
              onEditClick={handleEditLead}
              onDeleteClick={handleDeleteLead}
              onStatusChange={handleStatusChange}
              isAdminView={isAdminView}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem ? <KanbanItem id={activeItem.id} item={activeItem} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Survey Modal */}
      {surveyLead && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <h3>Hẹn Lịch Khảo Sát</h3>
            <p>Khách hàng: <strong>{surveyLead.customer_name}</strong></p>
            <input 
              type="datetime-local" 
              className="input-premium" 
              value={surveyDate}
              onChange={(e) => setSurveyDate(e.target.value)}
            />
            <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
              <button className="btn-primary" onClick={saveSurveyDate}>Lưu Lịch</button>
              <button className="btn-secondary" onClick={() => setSurveyLead(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingLead && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <h3>Sửa Thông Tin Khách Hàng</h3>
            <form onSubmit={saveEditedLead} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              <input type="text" placeholder="Tên khách hàng *" value={custName} onChange={e => setCustName(e.target.value)} required className="input-premium" />
              <input type="text" placeholder="Số điện thoại *" value={custPhone} onChange={e => setCustPhone(e.target.value)} required className="input-premium" />
              <input type="text" placeholder="Địa chỉ" value={custAddress} onChange={e => setCustAddress(e.target.value)} className="input-premium" />
              <input type="number" step="0.1" placeholder="Công suất dự kiến (kWp)" value={custKwp} onChange={e => setCustKwp(e.target.value)} className="input-premium" />
              <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button type="submit" className="btn-primary">Lưu Thay Đổi</button>
                <button type="button" className="btn-secondary" onClick={() => {
                  setEditingLead(null);
                  setCustName('');
                  setCustPhone('');
                  setCustAddress('');
                  setCustKwp('');
                }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quote Modal */}
      {quoteLead && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ width: '95%', maxWidth: '1200px', height: '85vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, #1e293b 100%)', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, color: '#0ea5e9' }}>📄 Báo Giá Tự Động - {quoteLead.customer_name}</h3>
              <button 
                onClick={() => setQuoteLead(null)} 
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>
            
            <iframe 
              src="https://baogia-solar24h.netlify.app/" 
              title="Báo Giá Solar 24h"
              style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
