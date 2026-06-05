import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { getTodayISO, generateSecureId } from '../utils/format';
import { notifyError } from '../utils/notifications';
import { logger } from '../utils/logger';

function toSupabaseRow(f) {
  return {
    numero: f.numero,
    client_id: f.clientId || null,
    client_nom: f.clientNom || null,
    devis_id: f.devisId || null,
    objet: f.objet || null,
    montant_ht: f.montantHT || 0,
    montant_tva: f.montantTVA || 0,
    montant_ttc: f.montantTTC || 0,
    montant_paye: f.montantPaye || 0,
    date_depot: f.dateDepot || null,
    date_echeance: f.dateEcheance || null,
    date_payement: f.datePayement || null,
    delai_reglement: f.delaiReglement || null,
    statut: f.statut || 'EMISE',
    notes: f.notes || null,
  };
}

export const useFacturesStore = create(
  persist(
    (set, get) => ({
      factures: [],
      compteurFacture: 100,

      getNextNumero: () => {
        const { compteurFacture } = get();
        const annee = new Date().getFullYear();
        const numero = `FAC-${compteurFacture}/${annee}`;
        set({ compteurFacture: compteurFacture + 1 });
        return numero;
      },

      addFacture: async (facture) => {
        let dateEcheance = null;
        if (facture.dateDepot && facture.delaiReglement) {
          const dateDepot = new Date(facture.dateDepot);
          dateDepot.setDate(dateDepot.getDate() + facture.delaiReglement);
          dateEcheance = dateDepot.toISOString().split('T')[0];
        }

        const numero = facture.numero || get().getNextNumero();

        const nouvelleFacture = {
          ...facture,
          id: generateSecureId('FAC'),
          numero: numero,
          dateCreation: facture.dateCreation || getTodayISO(),
          dateEcheance: dateEcheance,
          statut: facture.statut || 'EMISE'
        };

        set((state) => ({ factures: [...state.factures, nouvelleFacture] }));

        const { data, error } = await supabase.from('factures').insert(toSupabaseRow(nouvelleFacture)).select().single();
        if (error) {
          console.error('Supabase addFacture:', error.message);
          notifyError('Erreur de sauvegarde', `Impossible de créer la facture: ${error.message}`);
        } else if (data) {
          set((state) => ({
            factures: state.factures.map((f) => f.id === nouvelleFacture.id ? { ...f, id: data.id } : f)
          }));
          return { ...nouvelleFacture, id: data.id };
        }

        return nouvelleFacture;
      },

      updateFacture: (id, modifications) => {
        set((state) => ({
          factures: state.factures.map((f) => {
            if (f.id !== id) return f;
            const updated = { ...f, ...modifications };
            if ((modifications.dateDepot || modifications.delaiReglement) && updated.dateDepot && updated.delaiReglement) {
              const dateDepot = new Date(updated.dateDepot);
              dateDepot.setDate(dateDepot.getDate() + updated.delaiReglement);
              updated.dateEcheance = dateDepot.toISOString().split('T')[0];
            }
            return updated;
          })
        }));

        const factureMaj = get().factures.find((f) => f.id === id);
        if (factureMaj) {
          supabase.from('factures').update(toSupabaseRow({ ...factureMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) {
              logger.error('Supabase updateFacture:', error.message);
              notifyError('Erreur de mise à jour', `Impossible de modifier la facture: ${error.message}`);
            }
          }).catch((err) => {
            logger.error('Erreur updateFacture:', err.message);
          });
        }
      },

      deleteFacture: (id) => {
        set((state) => ({ factures: state.factures.filter((f) => f.id !== id) }));
        supabase.from('factures').delete().eq('id', id).then(({ error }) => {
          if (error) {
            logger.error('Supabase deleteFacture:', error.message);
            notifyError('Erreur de suppression', `Impossible de supprimer la facture: ${error.message}`);
          }
        }).catch((err) => {
          logger.error('Erreur deleteFacture:', err.message);
        });
      },

      getFactureById: (id) => {
        const { factures } = get();
        const facture = factures.find((f) => f.id === id);
        // Alias pour rétrocompatibilité
        if (facture) {
          return { ...facture, montantEncaisse: facture.montantPaye };
        }
        return facture;
      },

      getFactureByNumero: (numero) => {
        const { factures } = get();
        return factures.find((f) => f.numero === numero);
      },

      getFacturesByClient: (clientId) => {
        const { factures } = get();
        return factures.filter((f) => f.clientId === clientId);
      },

      getFacturesByStatut: (statut) => {
        const { factures } = get();
        return factures.filter((f) => f.statut === statut);
      },

      marquerPayee: (id, datePayement) => {
        const facture = get().getFactureById(id);
        get().updateFacture(id, {
          statut: 'PAYEE',
          datePayement: datePayement || getTodayISO()
        });
        
        if (typeof window !== 'undefined' && facture) {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().notifierPaiementRecu(
              facture.numero, 
              facture.montantTTC
            );
          });
        }
      },

      marquerPartielle: (id, montantPaye) => {
        get().updateFacture(id, {
          statut: 'PARTIELLE',
          montantPaye: montantPaye
        });
      },

      addPaiement: (factureId, paiement) => {
        const facture = get().getFactureById(factureId);
        if (!facture) return;

        const nouveauPaiement = {
          id: generateSecureId('FAC'),
          date: paiement.date || getTodayISO(),
          montant: parseFloat(paiement.montant) || 0,
          mode: paiement.mode || 'Virement',
          reference: paiement.reference || '',
          notes: paiement.notes || ''
        };

        const paiementsExistants = facture.paiements || [];
        const tousPaiements = [...paiementsExistants, nouveauPaiement];
        const montantTotalPaye = tousPaiements.reduce((sum, p) => sum + p.montant, 0);

        // Déterminer le nouveau statut
        let nouveauStatut = facture.statut;
        if (montantTotalPaye >= facture.montantTTC) {
          nouveauStatut = 'PAYEE';
        } else if (montantTotalPaye > 0) {
          nouveauStatut = 'PARTIELLE';
        }

        get().updateFacture(factureId, {
          paiements: tousPaiements,
          montantPaye: montantTotalPaye,
          statut: nouveauStatut,
          datePayement: nouveauStatut === 'PAYEE' ? (paiement.date || getTodayISO()) : facture.datePayement
        });

        // Notification
        if (typeof window !== 'undefined') {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().notifierPaiementRecu(
              facture.numero,
              nouveauPaiement.montant
            );
          });
        }

        return nouveauPaiement;
      },

      deletePaiement: (factureId, paiementId) => {
        const facture = get().getFactureById(factureId);
        if (!facture || !facture.paiements) return;

        const paiementsFiltres = facture.paiements.filter(p => p.id !== paiementId);
        const montantTotalPaye = paiementsFiltres.reduce((sum, p) => sum + p.montant, 0);

        // Recalculer le statut
        let nouveauStatut = 'EMISE';
        if (montantTotalPaye >= facture.montantTTC) {
          nouveauStatut = 'PAYEE';
        } else if (montantTotalPaye > 0) {
          nouveauStatut = 'PARTIELLE';
        }

        get().updateFacture(factureId, {
          paiements: paiementsFiltres,
          montantPaye: montantTotalPaye,
          statut: nouveauStatut,
          datePayement: nouveauStatut === 'PAYEE' ? paiementsFiltres[paiementsFiltres.length - 1]?.date : null
        });
      },

      annulerFacture: (id) => {
        get().updateFacture(id, {
          statut: 'ANNULEE',
          dateAnnulation: getTodayISO()
        });
      },

      getFacturesImpayees: () => {
        const { factures } = get();
        return factures.filter((f) => f.statut === 'EMISE' || f.statut === 'PARTIELLE');
      },

      getTotalImpaye: () => {
        const impayees = get().getFacturesImpayees();
        return impayees.reduce((total, f) => {
          const reste = f.montantTTC - (f.montantPaye || 0);
          return total + reste;
        }, 0);
      },

      setFactures: (factures) => {
        set({ factures });
      },

      // Fonctions pour Realtime (pas d'appel Supabase pour éviter boucle)
      addFactureFromRealtime: (facture) => {
        const { factures } = get();
        const existing = factures.find(f => f.id === facture.id);
        if (!existing) {
          set({ factures: [...factures, facture] });
        }
      }
    }),
    {
      name: 'sika_factures'
    }
  )
);
