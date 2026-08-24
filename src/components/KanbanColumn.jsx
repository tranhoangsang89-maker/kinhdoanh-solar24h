import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanItem from './KanbanItem';

export default function KanbanColumn({ id, title, items, onSurveyClick, onQuoteClick, onUploadQuote, onEditClick, onDeleteClick, isAdminView }) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="kanban-column">
      <div className="column-header">
        <span>{title}</span>
        <span className="column-count">{items.length}</span>
      </div>
      
      <div className="column-body" ref={setNodeRef}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <KanbanItem 
              key={item.id} 
              id={item.id} 
              item={item} 
              onSurveyClick={onSurveyClick}
              onQuoteClick={onQuoteClick}
              onUploadQuote={onUploadQuote}
              onEditClick={onEditClick}
              onDeleteClick={onDeleteClick}
              isAdminView={isAdminView}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
