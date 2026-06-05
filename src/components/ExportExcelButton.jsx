import { exportToExcel } from '../utils/excel'
import { useAudit } from '../hooks/useAudit'
import { useNotificationsStore } from '../store/useNotificationsStore'

export default function ExportExcelButton({ data, filename = 'export', sheetName = 'Données', module = 'Export' }) {
  const { logExportExcel } = useAudit();
  const { ajouterNotification } = useNotificationsStore();

  const handleExport = () => {
    if (!data || data.length === 0) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'EXPORT',
        message: 'Aucune donnée à exporter'
      })
      return
    }
    
    exportToExcel(data, filename, sheetName)
    
    // Enregistrer l'export dans l'audit trail
    logExportExcel(module, { filename, lignes: data.length, date: new Date().toISOString() })
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-vert text-white rounded-lg font-medium hover:bg-vert/90 transition-colors flex items-center gap-2"
    >
      <span className="text-lg">📊</span>
      <span>Exporter Excel</span>
    </button>
  )
}
