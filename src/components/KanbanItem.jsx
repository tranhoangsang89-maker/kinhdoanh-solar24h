import React, { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function KanbanItem({ id, item, onSurveyClick, onQuoteClick, onUploadQuote, onEditClick, onDeleteClick, onStatusChange, isOverlay, isAdminView }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file && onUploadQuote) {
      setIsUploading(true);
      await onUploadQuote(item.id, file);
      setIsUploading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-item ${isDragging && !isOverlay ? 'is-dragging' : ''}`}
    >
      <div 
        className="drag-handle" 
        style={{ paddingBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div className="item-title" style={{ flex: 1, paddingRight: '10px' }}>{item.customer_name}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onEditClick && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEditClick(item); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}
              title="Sửa thông tin"
            >
              ✏️
            </button>
          )}
          {onDeleteClick && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteClick(item); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}
              title="Xóa khách hàng"
            >
              🗑️
            </button>
          )}
          <div style={{ opacity: 0.5, cursor: 'grab', marginLeft: '5px' }} {...attributes} {...listeners}>⠿</div>
        </div>
      </div>
      
      <div className="item-subtitle">
        📞 {item.phone}
      </div>
      <div className="item-subtitle">
        📍 {item.address || 'Chưa cập nhật'}
      </div>
      
      {item.survey_date && (
        <div className="item-subtitle" style={{ color: 'var(--gold-accent)' }}>
          📅 Hẹn: {formatDate(item.survey_date)}
        </div>
      )}

      {item.kwp > 0 && (
        <div style={{ marginTop: '5px' }}>
          <span className="item-kwp">{item.kwp} kWp</span>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".pdf" 
        onChange={handleFileChange} 
      />

      {/* Action Buttons based on status */}
      <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
        {item.status === 'Khảo sát' && !isAdminView && onSurveyClick && (
          <button 
            className="btn-primary" 
            style={{ fontSize: '0.8rem', padding: '5px 10px', width: 'auto', flex: 1 }}
            onClick={() => onSurveyClick(item)}
          >
            📅 Lên Hẹn
          </button>
        )}
        
        {item.status === 'Báo giá' && (
          <>
            {!isAdminView && onQuoteClick && (
              <button 
                className="btn-primary" 
                style={{ fontSize: '0.8rem', padding: '5px 10px', width: 'auto', flex: 1, background: 'var(--gold-accent)', color: '#000' }}
                onClick={() => onQuoteClick(item)}
              >
                📄 Báo Giá
              </button>
            )}
            
            {item.quote_file_url ? (
              <button 
                className="btn-secondary" 
                style={{ fontSize: '0.8rem', padding: '5px 10px', width: 'auto', flex: 1, borderColor: '#0ea5e9', color: '#0ea5e9' }}
                onClick={() => window.open(item.quote_file_url, '_blank')}
              >
                👁️ Xem báo giá
              </button>
            ) : (
              !isAdminView && (
                <button 
                  className="btn-secondary" 
                  style={{ fontSize: '0.8rem', padding: '5px 10px', width: 'auto', flex: 1 }}
                  onClick={() => fileInputRef.current.click()}
                  disabled={isUploading}
                >
                  {isUploading ? '⏳ Đang tải...' : '📎 Tải lên'}
                </button>
              )
            )}
          </>
        )}
      </div>

      {/* Mobile-friendly status change dropdown */}
      {onStatusChange && !isAdminView && (
        <div style={{ marginTop: '10px' }}>
          <select 
            value={item.status} 
            onChange={(e) => { e.stopPropagation(); onStatusChange(item.id, e.target.value); }}
            className="input-premium"
            style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100%', cursor: 'pointer' }}
          >
            <option value="Mới">Mới</option>
            <option value="Khảo sát">Khảo sát</option>
            <option value="Báo giá">Báo giá</option>
            <option value="Chốt Deal">Chốt Deal</option>
            <option value="Rớt Khách">Rớt Khách</option>
          </select>
        </div>
      )}
    </div>
  );
}
