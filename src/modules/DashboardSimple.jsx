export default function DashboardSimple() {
  console.log('🎯 Dashboard Simple - Rendu')
  
  return (
    <div className="p-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-4" style={{ color: '#06006E' }}>
          ✅ Tableau de Bord SIKA INDUSTRIE
        </h1>
        <p className="text-lg" style={{ color: '#06006E' }}>
          Le tableau de bord fonctionne correctement !
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-2xl font-bold" style={{ color: '#06006E' }}>0</p>
            <p className="text-sm" style={{ color: '#06006E' }}>Clients</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-2xl font-bold" style={{ color: '#06006E' }}>0</p>
            <p className="text-sm" style={{ color: '#06006E' }}>Factures</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-2xl font-bold" style={{ color: '#06006E' }}>0 FCFA</p>
            <p className="text-sm" style={{ color: '#06006E' }}>Chiffre d'affaires</p>
          </div>
        </div>
      </div>
    </div>
  )
}
