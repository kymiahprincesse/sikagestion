import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAudit } from '../hooks/useAudit';
import { useParametresStore } from '../store/useParametresStore';
import { useAuditStore } from '../store/useAuditStore';
import { AUDIT_MODULES } from '../config/auditConfig';
import { useNotification } from '../hooks/useNotification';
import NotificationToast from './NotificationToast';

export default function Parametres() {
  const { logModification } = useAudit();
  const { notifications: toasts, success, removeNotification } = useNotification();
  const store = useParametresStore();
  const { logs, fetchLogs, clearOldLogs } = useAuditStore();
  const [confirmVider, setConfirmVider] = useState(false);

  const [entreprise, setEntreprise] = useState({
    nom: store.nomEntreprise,
    adresse: store.adresseEntreprise,
    telephone1: store.telephoneEntreprise,
    telephone2: store.telephone2 || '',
    email: store.emailEntreprise,
    siteWeb: store.siteWeb || '',
    capital: store.capital || '',
    cc: store.cc || '',
    rcm: store.rcm || '',
    rccm: store.rccm || '',
  });

  const [financier, setFinancier] = useState({
    tauxTVA: Math.round((store.tvaRate || 0.18) * 100),
    devise: store.devise || 'FCFA',
    tauxRemiseDefaut: store.tauxRemiseDefaut ?? 10,
    delaiPaiementDefaut: store.delaiPaiementDefaut ?? 30,
    plafondAlerteCredit: store.plafondAlerteCredit ?? 5000000,
    tauxHoraireTechnicien: store.tauxHoraireTechnicien ?? 15000,
    soldeInitialEncaissements: store.soldeInitialEncaissements ?? 0,
  });

  const [budget, setBudget] = useState({
    indemnitRepas: store.indemniteRepas ?? 5000,
    prixCarburant: store.prixCarburant ?? 700,
    consommationMoyenne: store.consommationMoyenne ?? 8,
  });

  const [securite, setSecurite] = useState({
    timeoutSession: store.timeoutSession ?? 30,
    maxTentativesConnexion: store.maxTentativesConnexion ?? 3,
    filigraneActif: store.filigraneActif ?? true,
    auditActif: store.auditActif ?? true,
  });

  const [notifs, setNotifs] = useState({
    budgetDepasse: store.notifBudgetDepasse ?? true,
    facturesImpayees: store.notifFacturesImpayees ?? true,
    devisGagnes: store.notifDevisGagnes ?? true,
    nouveauxAO: store.notifNouveauxAO ?? true,
    encaissements: store.notifEncaissements ?? true,
    tachesRetard: store.notifTachesRetard ?? true,
  });

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSaveEntreprise = () => {
    store.updateInfosEntreprise({
      nomEntreprise: entreprise.nom, adresseEntreprise: entreprise.adresse,
      telephoneEntreprise: entreprise.telephone1, telephone2: entreprise.telephone2,
      emailEntreprise: entreprise.email, siteWeb: entreprise.siteWeb,
      capital: entreprise.capital, cc: entreprise.cc, rcm: entreprise.rcm, rccm: entreprise.rccm,
    });
    logModification(AUDIT_MODULES.PARAMETRES, 'Profil entreprise', 'Informations entreprise modifiées');
    success('Profil entreprise sauvegardé');
  };

  const handleSaveFinancier = () => {
    store.setTvaRate(financier.tauxTVA / 100);
    store.setDevise(financier.devise);
    store.setTauxRemiseDefaut(financier.tauxRemiseDefaut);
    store.setDelaiPaiementDefaut(financier.delaiPaiementDefaut);
    store.setPlafondAlerteCredit(financier.plafondAlerteCredit);
    store.setTauxHoraireTechnicien(financier.tauxHoraireTechnicien);
    store.setSoldeInitialEncaissements(financier.soldeInitialEncaissements);
    logModification(AUDIT_MODULES.PARAMETRES, 'Paramètres financiers',
      `TVA ${financier.tauxTVA}% — Remise ${financier.tauxRemiseDefaut}% — Délai ${financier.delaiPaiementDefaut}j`);
    success('Paramètres financiers sauvegardés');
  };

  const handleSaveBudget = () => {
    store.setIndemniteRepas(budget.indemnitRepas);
    store.setPrixCarburant(budget.prixCarburant);
    store.setConsommationMoyenne(budget.consommationMoyenne);
    logModification(AUDIT_MODULES.PARAMETRES, 'Budget planification',
      `Repas ${budget.indemnitRepas} FCFA — Carburant ${budget.prixCarburant} FCFA/L`);
    success('Paramètres budget sauvegardés');
  };

  const handleSaveSecurite = () => {
    store.setTimeoutSession(securite.timeoutSession);
    store.setMaxTentativesConnexion(securite.maxTentativesConnexion);
    store.setFiligraneActif(securite.filigraneActif);
    logModification(AUDIT_MODULES.PARAMETRES, 'Sécurité',
      `Timeout ${securite.timeoutSession}min — Filigrane ${securite.filigraneActif ? 'actif' : 'inactif'}`);
    success('Paramètres sécurité sauvegardés');
  };

  const handleSaveNotifs = () => {
    store.setNotifications({
      notifBudgetDepasse: notifs.budgetDepasse, notifFacturesImpayees: notifs.facturesImpayees,
      notifDevisGagnes: notifs.devisGagnes, notifNouveauxAO: notifs.nouveauxAO,
      notifEncaissements: notifs.encaissements, notifTachesRetard: notifs.tachesRetard,
    });
    const n = Object.values(notifs).filter(Boolean).length;
    logModification(AUDIT_MODULES.PARAMETRES, 'Notifications', `${n}/6 notifications activées`);
    success('Préférences notifications sauvegardées');
  };

  const handleReset = () => {
    if (!window.confirm('Réinitialiser tous les paramètres aux valeurs par défaut ?')) return;
    store.resetParametres();
    success('Paramètres réinitialisés aux valeurs par défaut');
  };

  const handleExportPDF = async () => {
    await fetchLogs();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14); doc.setTextColor(27, 42, 74);
    doc.text('Rapport d\'audit — SIKA INDUSTRIE', 14, 16);
    doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${logs.length} entrées`, 14, 23);
    doc.autoTable({
      startY: 28,
      head: [['Date', 'Heure', 'Utilisateur', 'Rôle', 'Module', 'Action', 'Cible', 'Détails']],
      body: logs.map(l => [
        l.dateJour || '-', l.heureExacte || '-',
        l.userNom || l.userLogin || '-', l.userRole || '-',
        l.module || '-', l.action || '-',
        (l.cible || '').slice(0, 30), (l.details || '').slice(0, 40),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [27, 42, 74], textColor: [255, 255, 255] },
    });
    doc.save(`audit-sika-${new Date().toISOString().split('T')[0]}.pdf`);
    success(`${logs.length} entrées exportées en PDF`);
  };

  const handleExportExcel = async () => {
    await fetchLogs();
    const data = logs.map(l => ({
      Date: l.dateJour || '', Heure: l.heureExacte || '',
      Utilisateur: l.userNom || l.userLogin || '', Role: l.userRole || '',
      Module: l.module || '', Action: l.action || '',
      Cible: l.cible || '', Details: l.details || '', IP: l.ipAddress || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    XLSX.writeFile(wb, `audit-sika-${new Date().toISOString().split('T')[0]}.xlsx`);
    success(`${logs.length} entrées exportées en Excel`);
  };

  const handleViderLogs = async () => {
    if (!confirmVider) { setConfirmVider(true); return; }
    await clearOldLogs();
    setConfirmVider(false);
    success('Logs anciens (> 6 mois) supprimés');
  };

  return (
    <div style={{ padding: '20px', background: '#F8F9FC', minHeight: '100vh' }}>
      <NotificationToast notifications={toasts} onClose={removeNotification} />

      <div style={{ background: 'var(--color-primary)', borderRadius: '12px',
                    padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '32px' }}>⚙️</span>
            <div>
              <h1 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
                PARAMÈTRES SYSTÈME
              </h1>
              <p style={{ color: 'var(--color-border)', margin: 0, fontSize: '13px' }}>
                Configuration globale de SIKAGESTION
              </p>
            </div>
          </div>
          <button onClick={handleReset} style={{ ...btnAction, background: 'var(--color-accent)' }}>
            🔄 Réinitialiser
          </button>
        </div>
      </div>

      <Section titre="Profil de l'entreprise" icone="🏢">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <Field label="Nom société" value={entreprise.nom}
            onChange={v => setEntreprise({...entreprise, nom: v})} />
          <Field label="Adresse" value={entreprise.adresse}
            onChange={v => setEntreprise({...entreprise, adresse: v})} />
          <Field label="Téléphone 1" value={entreprise.telephone1}
            onChange={v => setEntreprise({...entreprise, telephone1: v})} />
          <Field label="Téléphone 2" value={entreprise.telephone2}
            onChange={v => setEntreprise({...entreprise, telephone2: v})} />
          <Field label="Email" value={entreprise.email}
            onChange={v => setEntreprise({...entreprise, email: v})} />
          <Field label="Site web" value={entreprise.siteWeb}
            onChange={v => setEntreprise({...entreprise, siteWeb: v})} />
          <Field label="Capital" value={entreprise.capital}
            onChange={v => setEntreprise({...entreprise, capital: v})} />
          <Field label="CC N°" value={entreprise.cc}
            onChange={v => setEntreprise({...entreprise, cc: v})} />
          <Field label="RCM N°" value={entreprise.rcm}
            onChange={v => setEntreprise({...entreprise, rcm: v})} />
          <Field label="RCCM" value={entreprise.rccm}
            onChange={v => setEntreprise({...entreprise, rccm: v})} />
        </div>
        <button onClick={handleSaveEntreprise} style={btnSave}>
          💾 Sauvegarder le profil
        </button>
      </Section>

      <Section titre="Paramètres financiers" icone="�">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <Field label="Taux TVA (%)" type="number" value={financier.tauxTVA}
            onChange={v => setFinancier({...financier, tauxTVA: parseFloat(v)})} />
          <Field label="Devise" value={financier.devise}
            onChange={v => setFinancier({...financier, devise: v})} />
          <Field label="Remise par défaut (%)" type="number" value={financier.tauxRemiseDefaut}
            onChange={v => setFinancier({...financier, tauxRemiseDefaut: parseFloat(v)})} />
          <Field label="Délai paiement (jours)" type="number" value={financier.delaiPaiementDefaut}
            onChange={v => setFinancier({...financier, delaiPaiementDefaut: parseInt(v)})} />
          <Field label="Plafond alerte crédit (FCFA)" type="number" value={financier.plafondAlerteCredit}
            onChange={v => setFinancier({...financier, plafondAlerteCredit: parseInt(v)})} />
          <Field label="Taux horaire technicien (FCFA/h)" type="number" value={financier.tauxHoraireTechnicien}
            onChange={v => setFinancier({...financier, tauxHoraireTechnicien: parseInt(v)})} />
          <Field label="Solde initial encaissements (FCFA)" type="number" value={financier.soldeInitialEncaissements}
            onChange={v => setFinancier({...financier, soldeInitialEncaissements: parseInt(v)})} />
        </div>
        <button onClick={handleSaveFinancier} style={btnSave}>
          💾 Sauvegarder les paramètres financiers
        </button>
      </Section>

      <Section titre="Budget planification" icone="�">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <Field label="Indemnité repas/personne/jour (FCFA)" type="number" value={budget.indemnitRepas}
            onChange={v => setBudget({...budget, indemnitRepas: parseInt(v)})} />
          <Field label="Prix carburant/litre (FCFA)" type="number" value={budget.prixCarburant}
            onChange={v => setBudget({...budget, prixCarburant: parseInt(v)})} />
          <Field label="Consommation moyenne véhicule (L/100km)" type="number" value={budget.consommationMoyenne}
            onChange={v => setBudget({...budget, consommationMoyenne: parseFloat(v)})} />
        </div>
        <button onClick={handleSaveBudget} style={btnSave}>
          💾 Sauvegarder les paramètres budget
        </button>
      </Section>

      <Section titre="Session & Sécurité" icone="�">
        <div style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '8px' }}>
              Timeout session (minutes) : {securite.timeoutSession} min
            </label>
            <input type="range" min="5" max="120" value={securite.timeoutSession}
              onChange={e => setSecurite({...securite, timeoutSession: parseInt(e.target.value)})}
              style={{ width: '100%' }} />
          </div>
          <Field label="Nombre max tentatives connexion avant alerte" type="number"
            value={securite.maxTentativesConnexion}
            onChange={v => setSecurite({...securite, maxTentativesConnexion: parseInt(v)})} />
          <Toggle label="Activer filigrane sur documents" checked={securite.filigraneActif}
            onChange={v => setSecurite({...securite, filigraneActif: v})} />
          <Toggle label="Activer l'audit (réservé SUPER_ADMIN)" checked={securite.auditActif}
            onChange={v => setSecurite({...securite, auditActif: v})} disabled />
        </div>
        <button onClick={handleSaveSecurite} style={btnSave}>
          💾 Sauvegarder les paramètres sécurité
        </button>
      </Section>

      <Section titre="Notifications" icone="�">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <Toggle label="Budget dépassé" checked={notifs.budgetDepasse}
            onChange={v => setNotifs({...notifs, budgetDepasse: v})} />
          <Toggle label="Factures impayées" checked={notifs.facturesImpayees}
            onChange={v => setNotifs({...notifs, facturesImpayees: v})} />
          <Toggle label="Devis gagnés" checked={notifs.devisGagnes}
            onChange={v => setNotifs({...notifs, devisGagnes: v})} />
          <Toggle label="Nouveaux appels d'offres" checked={notifs.nouveauxAO}
            onChange={v => setNotifs({...notifs, nouveauxAO: v})} />
          <Toggle label="Encaissements reçus" checked={notifs.encaissements}
            onChange={v => setNotifs({...notifs, encaissements: v})} />
          <Toggle label="Tâches en retard" checked={notifs.tachesRetard}
            onChange={v => setNotifs({...notifs, tachesRetard: v})} />
        </div>
        <button onClick={handleSaveNotifs} style={btnSave}>
          💾 Sauvegarder les notifications
        </button>
      </Section>

      <Section titre="Tour de contrôle & Audit" icone="�️">
        <div style={{ marginBottom: '16px', padding: '14px', background: 'var(--color-surface-muted)',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>�📊</span>
          <div>
            <div style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '20px' }}>{logs.length} actions</div>
            <div style={{ color: '#555', fontSize: '12px' }}>enregistrées dans le journal d'audit</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleExportPDF} style={btnAction}>📄 Exporter PDF</button>
          <button onClick={handleExportExcel} style={btnAction}>📊 Exporter Excel</button>
          {!confirmVider ? (
            <button onClick={handleViderLogs} style={{ ...btnAction, background: 'var(--color-accent)' }}>
              🗑️ Vider les logs &gt; 6 mois
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center',
                          padding: '8px 12px', background: 'var(--color-accent-light)', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-accent)', fontWeight: 'bold' }}>⚠️ Confirmer la suppression ?</span>
              <button onClick={handleViderLogs} style={{ ...btnAction, background: 'var(--color-accent)', padding: '6px 12px', fontSize: '12px' }}>✅ Oui</button>
              <button onClick={() => setConfirmVider(false)} style={{ ...btnAction, background: '#666', padding: '6px 12px', fontSize: '12px' }}>❌ Annuler</button>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({ titre, icone, children }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '24px',
                  marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <h2 style={{ color: 'var(--color-primary)', fontSize: '18px', fontWeight: 'bold',
                   marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>{icone}</span>
        {titre}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 'bold', color: 'var(--color-primary)',
                      marginBottom: '6px', fontSize: '13px' }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px', borderRadius: '8px',
                 border: '1.5px solid var(--color-surface-muted)', fontSize: '13px',
                 color: 'var(--color-primary)', outline: 'none' }} />
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', background: '#F8F9FC', borderRadius: '8px' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        style={{ width: '20px', height: '20px', cursor: disabled ? 'not-allowed' : 'pointer' }} />
      <label style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: '500',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1 }}>
        {label}
      </label>
    </div>
  );
}

const btnSave = {
  marginTop: '16px', padding: '12px 24px', borderRadius: '8px',
  border: 'none', background: 'var(--color-success)', color: 'white',
  fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
  boxShadow: '0 2px 6px rgba(26,122,74,0.3)',
};

const btnAction = {
  padding: '10px 20px', borderRadius: '8px', border: 'none',
  background: 'var(--color-secondary)', color: 'white', fontWeight: 'bold',
  cursor: 'pointer', fontSize: '13px',
  boxShadow: '0 2px 4px rgba(31,92,153,0.3)',
};
