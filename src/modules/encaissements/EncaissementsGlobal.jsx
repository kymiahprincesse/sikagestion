import { useState, useMemo, useEffect } from 'react'
import { useFacturesStore } from '../../store/useFacturesStore'
import { useClientsStore } from '../../store/useClientsStore'
import { useEncaissementsStore } from '../../store/useEncaissementsStore'
import { useAuditStore } from '../../store/useAuditStore'
import { useNotificationsStore } from '../../store/useNotificationsStore'
import SikaHeader from '../../components/SikaHeader'
import SikaFooter from '../../components/SikaFooter'
import ExportExcelButton from '../../components/ExportExcelButton'
import { formatDateLong, formatFCFA } from '../../utils/format'

const MOYENS_PAIEMENT = ['ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'TRAITE', 'AUTRE']

export default function EncaissementsGlobal() {
  const { factures, getStatistiques, updateFacture } = useFacturesStore()
  const { clients, getClientById } = useClientsStore()
  const { addEncaissement } = useEncaissementsStore()
  const { addLog } = useAuditStore()
  const { ajouterNotification } = useNotificationsStore()
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [clientFiltre, setClientFiltre] = useState('')
  const [showModalEncaissement, setShowModalEncaissement] = useState(false)
  const [factureSelectionnee, setFactureSelectionnee] = useState(null)
  const [formEncaissement, setFormEncaissement] = useState({
    montant: '',
    date: new Date().toISOString().split('T')[0],
    moyenPaiement: '',
    reference: '',
    observation: ''
  })


  const stats = getStatistiques()

  const facturesFiltrees = useMemo(() => {
    let resultat = [...factures]

    if (dateDebut) {
      resultat = resultat.filter(f => f.dateFacture >= dateDebut)
    }

    if (dateFin) {
      resultat = resultat.filter(f => f.dateFacture <= dateFin)
    }

    if (clientFiltre) {
      resultat = resultat.filter(f => f.clientId === parseInt(clientFiltre))
    }

    return resultat.sort((a, b) => new Date(b.dateFacture) - new Date(a.dateFacture))
  }, [factures, dateDebut, dateFin, clientFiltre])

  const totauxFiltres = useMemo(() => {
    const totalFacture = facturesFiltrees.reduce((sum, f) => sum + (f.montantTTC || 0), 0)
    const totalEncaisse = facturesFiltrees.reduce((sum, f) => sum + (f.montantPaye || 0), 0)
    const totalRestant = totalFacture - totalEncaisse

    return { totalFacture, totalEncaisse, totalRestant }
  }, [facturesFiltrees])

  const handleAjouterEncaissement = (facture) => {
    const restant = (facture.montantTTC || 0) - (facture.montantPaye || 0)
    setFactureSelectionnee(facture)
    setFormEncaissement({
      montant: restant.toString(),
      date: new Date().toISOString().split('T')[0],
      moyenPaiement: '',
      reference: '',
      observation: ''
    })
    setShowModalEncaissement(true)
  }

  const handleSaveEncaissement = () => {
    if (!formEncaissement.montant || !formEncaissement.date || !formEncaissement.moyenPaiement) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'VALIDATION',
        message: 'Veuillez remplir tous les champs obligatoires'
      })
      return
    }

    const montant = parseFloat(formEncaissement.montant)
    const restant = (factureSelectionnee.montantTTC || 0) - (factureSelectionnee.montantEncaisse || 0)

    if (montant <= 0 || montant > restant) {
      ajouterNotification({
        type: 'ATTENTION',
        icone: '⚠️',
        titre: 'VALIDATION',
        message: `Le montant doit être entre 0 et ${formatFCFA(restant)}`
      })
      return
    }

    // Ajouter l'encaissement
    addEncaissement({
      factureId: factureSelectionnee.id,
      montant: montant,
      date: formEncaissement.date,
      moyenPaiement: formEncaissement.moyenPaiement,
      reference: formEncaissement.reference,
      observation: formEncaissement.observation
    })

    // Mettre à jour la facture
    const nouveauMontantEncaisse = (factureSelectionnee.montantPaye || 0) + montant
    const nouveauStatut = nouveauMontantEncaisse >= factureSelectionnee.montantTTC ? 'PAYEE' : 'PARTIEL'
    
    updateFacture(factureSelectionnee.id, {
      montantPaye: nouveauMontantEncaisse,
      statutPaiement: nouveauStatut,
      dateReglement: nouveauStatut === 'PAYEE' ? formEncaissement.date : factureSelectionnee.dateReglement,
      moyenReglement: nouveauStatut === 'PAYEE' ? formEncaissement.moyenPaiement : factureSelectionnee.moyenReglement
    })

    addLog({
      module: 'ENCAISSEMENTS',
      action: 'AJOUT_REGLEMENT',
      utilisateur: 'Admin',
      avant: { factureId: factureSelectionnee.id, montantPaye: factureSelectionnee.montantPaye },
      apres: { montant: montant, nouveauTotal: nouveauMontantEncaisse }
    })

    setShowModalEncaissement(false)
    setFactureSelectionnee(null)
  }

  const dataExport = facturesFiltrees.map(facture => {
    const client = getClientById(facture.clientId)
    return {
      'N° Facture': facture.numero,
      'Date': facture.dateFacture,
      'Client': client?.nom || 'N/A',
      'Montant TTC': facture.montantTTC,
      'Encaissé': facture.montantPaye || 0,
      'Reste à payer': (facture.montantTTC || 0) - (facture.montantPaye || 0),
      'Statut': facture.statutPaiement
    }
  })

  return (
    <div className="space-y-6">
      <SikaHeader
        titre="Encaissements Global"
        soustitre="Vue d'ensemble des encaissements et créances"
      />

      {/* STATISTIQUES GLOBALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#06006E' }}>
          <p className="text-sm font-medium" style={{ color: '#06006E' }}>Total Facturé</p>
          <p className="text-2xl font-bold mt-2" style={{ color: '#06006E' }}>
            {formatFCFA(stats.totalFacture)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#1A7A4A' }}>
          <p className="text-sm font-medium" style={{ color: '#1A7A4A' }}>Total Encaissé</p>
          <p className="text-2xl font-bold mt-2" style={{ color: '#06006E' }}>
            {formatFCFA(stats.totalEncaisse)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#E60000' }}>
          <p className="text-sm font-medium" style={{ color: '#E60000' }}>Reste à Encaisser</p>
          <p className="text-2xl font-bold mt-2" style={{ color: '#06006E' }}>
            {formatFCFA(stats.totalRestant)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4" style={{ borderColor: '#E60000' }}>
          <p className="text-sm font-medium" style={{ color: '#E60000' }}>Factures Impayées</p>
          <p className="text-2xl font-bold mt-2" style={{ color: '#06006E' }}>
            {stats.impayees}
          </p>
        </div>
      </div>

      {/* FILTRES */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4" style={{ color: '#06006E' }}>Filtres</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
              Date début
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
              style={{ borderColor: '#C8C8D0' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
              Date fin
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
              style={{ borderColor: '#C8C8D0' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#06006E' }}>
              Client
            </label>
            <select
              value={clientFiltre}
              onChange={(e) => setClientFiltre(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange focus:border-transparent"
              style={{ borderColor: '#C8C8D0' }}
            >
              <option value="">Tous les clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.nom}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <ExportExcelButton
              data={dataExport}
              filename="encaissements_global"
              sheetName="Encaissements"
            />
          </div>
        </div>
      </div>

      {/* TOTAUX FILTRÉS */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: '#06006E' }}>Total Facturé (filtré)</p>
            <p className="text-xl font-bold mt-1" style={{ color: '#06006E' }}>
              {formatFCFA(totauxFiltres.totalFacture)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: '#1A7A4A' }}>Total Encaissé (filtré)</p>
            <p className="text-xl font-bold mt-1" style={{ color: '#06006E' }}>
              {formatFCFA(totauxFiltres.totalEncaisse)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: '#E60000' }}>Reste à Encaisser (filtré)</p>
            <p className="text-xl font-bold mt-1" style={{ color: '#06006E' }}>
              {formatFCFA(totauxFiltres.totalRestant)}
            </p>
          </div>
        </div>
      </div>

      {/* TABLEAU DES FACTURES */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#06006E' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  N° Facture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  Montant TTC
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  Encaissé
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  Reste à payer
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: 'white', borderColor: '#C8C8D0' }}>
              {facturesFiltrees.map((facture, index) => {
                const client = getClientById(facture.clientId)
                const restant = (facture.montantTTC || 0) - (facture.montantPaye || 0)
                
                return (
                  <tr
                    key={facture.id}
                    className="hover:bg-opacity-50"
                    style={{ backgroundColor: index % 2 === 0 ? 'white' : '#E8ECF4' }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: '#06006E' }}>
                      {facture.numero}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#06006E' }}>
                      {formatDateLong(facture.dateFacture)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: '#06006E' }}>
                      {client?.nom || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium" style={{ color: '#06006E' }}>
                      {formatFCFA(facture.montantTTC)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium" style={{ color: '#1A7A4A' }}>
                      {formatFCFA(facture.montantPaye || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium" style={{ color: restant > 0 ? '#E60000' : '#1A7A4A' }}>
                      {formatFCFA(restant)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: facture.statutPaiement === 'PAYEE' ? '#1A7A4A' : facture.statutPaiement === 'PARTIEL' ? '#E60000' : '#E60000',
                          color: 'white'
                        }}
                      >
                        {facture.statutPaiement}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {restant > 0 && (
                        <button
                          onClick={() => handleAjouterEncaissement(facture)}
                          className="px-3 py-1 rounded text-xs font-semibold text-white hover:opacity-90 transition"
                          style={{ backgroundColor: '#1A7A4A' }}
                          title="Ajouter un règlement"
                        >
                          💰 Encaisser
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {facturesFiltrees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: '#06006E' }}>Aucune facture trouvée</p>
          </div>
        )}
      </div>

      {/* Modal Encaissement */}
      {showModalEncaissement && factureSelectionnee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b" style={{ backgroundColor: '#06006E' }}>
              <h2 className="text-xl font-bold text-white">
                💰 Enregistrer un encaissement
              </h2>
              <p className="text-sm text-white mt-1">Facture {factureSelectionnee.numero}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-navyClair p-3 rounded-lg">
                <p className="text-sm" style={{ color: '#06006E' }}>Client: <span className="font-bold">{getClientById(factureSelectionnee.clientId)?.nom}</span></p>
                <p className="text-sm" style={{ color: '#06006E' }}>Montant TTC: <span className="font-bold">{formatFCFA(factureSelectionnee.montantTTC)}</span></p>
                <p className="text-sm" style={{ color: '#1A7A4A' }}>Déjà encaissé: <span className="font-bold">{formatFCFA(factureSelectionnee.montantPaye || 0)}</span></p>
                <p className="text-sm" style={{ color: '#E60000' }}>Reste à payer: <span className="font-bold">{formatFCFA((factureSelectionnee.montantTTC || 0) - (factureSelectionnee.montantPaye || 0))}</span></p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#06006E' }}>Montant à encaisser *</label>
                <input
                  type="number"
                  value={formEncaissement.montant}
                  onChange={(e) => setFormEncaissement({ ...formEncaissement, montant: e.target.value })}
                  className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none"
                  style={{ borderColor: '#C8C8D0' }}
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#06006E' }}>Date d'encaissement *</label>
                <input
                  type="date"
                  value={formEncaissement.date}
                  onChange={(e) => setFormEncaissement({ ...formEncaissement, date: e.target.value })}
                  className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none"
                  style={{ borderColor: '#C8C8D0' }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#06006E' }}>Moyen de paiement *</label>
                <select
                  value={formEncaissement.moyenPaiement}
                  onChange={(e) => setFormEncaissement({ ...formEncaissement, moyenPaiement: e.target.value })}
                  className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none"
                  style={{ borderColor: '#C8C8D0' }}
                  required
                >
                  <option value="">Sélectionner</option>
                  {MOYENS_PAIEMENT.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#06006E' }}>Référence</label>
                <input
                  type="text"
                  value={formEncaissement.reference}
                  onChange={(e) => setFormEncaissement({ ...formEncaissement, reference: e.target.value })}
                  className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none"
                  style={{ borderColor: '#C8C8D0' }}
                  placeholder="N° chèque, virement..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: '#06006E' }}>Observation</label>
                <textarea
                  value={formEncaissement.observation}
                  onChange={(e) => setFormEncaissement({ ...formEncaissement, observation: e.target.value })}
                  className="w-full px-4 py-2 border-2 rounded-lg focus:outline-none"
                  style={{ borderColor: '#C8C8D0' }}
                  rows="2"
                  placeholder="Notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEncaissement}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition"
                  style={{ backgroundColor: '#1A7A4A' }}
                >
                  💾 Enregistrer
                </button>
                <button
                  onClick={() => setShowModalEncaissement(false)}
                  className="px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
                  style={{ backgroundColor: '#C8C8D0', color: '#06006E' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SikaFooter />
    </div>
  )
}
