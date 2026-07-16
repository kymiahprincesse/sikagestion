import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'

export default function ActionButtons({ 
  onAdd, 
  onEdit, 
  onView, 
  onPrint, 
  onDelete,
  permissions = { add: true, edit: true, view: true, print: true, delete: true }
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = () => {
    setShowConfirm(true)
  }

  const confirmDelete = () => {
    setShowConfirm(false)
    if (onDelete) onDelete()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {permissions.add && onAdd && (
          <button
            onClick={onAdd}
            className="px-3 py-1.5 bg-vert text-white rounded-lg text-sm font-medium hover:bg-vert/90 transition-colors flex items-center gap-1"
            title="Ajouter"
          >
            <span>➕</span>
            <span>Ajouter</span>
          </button>
        )}

        {permissions.edit && onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu/90 transition-colors flex items-center gap-1"
            title="Modifier"
          >
            <span>📝</span>
            <span>Modifier</span>
          </button>
        )}

        {permissions.view && onView && (
          <button
            onClick={onView}
            className="px-3 py-1.5 bg-rouge text-white rounded-lg text-sm font-medium hover:bg-rouge/90 transition-colors flex items-center gap-1"
            title="Voir"
          >
            <span>👁</span>
            <span>Voir</span>
          </button>
        )}

        {permissions.print && onPrint && (
          <button
            onClick={onPrint}
            className="px-3 py-1.5 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy/90 transition-colors flex items-center gap-1"
            title="Imprimer"
          >
            <span>🖨</span>
            <span>Imprimer</span>
          </button>
        )}

        {permissions.delete && onDelete && (
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 bg-rouge text-white rounded-lg text-sm font-medium hover:bg-rouge/90 transition-colors flex items-center gap-1"
            title="Supprimer"
          >
            <span>🗑</span>
            <span>Supprimer</span>
          </button>
        )}
      </div>

      {showConfirm && (
        <ConfirmDialog
          message="Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible."
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
