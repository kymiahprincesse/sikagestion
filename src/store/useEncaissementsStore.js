import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { notifyError } from '../utils/notifications';
import { logger } from '../utils/logger';
import { generateSecureId } from '../utils/format';

function toSupabaseRow(e) {
  return {
    facture_id: e.factureId || null,
    client_id: e.clientId || null,
    client_nom: e.clientNom || null,
    montant: e.montant || 0,
    date_encaissement: e.dateEncaissement || new Date().toISOString().split('T')[0],
    mode_paiement: e.modePaiement || null,
    reference: e.reference || null,
    notes: e.notes || null,
    statut: e.statut || 'VALIDE',
    mouvement_caisse_id: e.mouvementCaisseId || null,
  };
}

export const useEncaissementsStore = create(
  persist(
    (set, get) => ({
      encaissements: [],
      soldeInitial: 200600,

      addEncaissement: async (encaissement) => {
        const nouvelEncaissement = {
          ...encaissement,
          id: generateSecureId('ENC'),
          dateEncaissement: encaissement.dateEncaissement || new Date().toISOString().split('T')[0]
        };

        set((state) => ({ encaissements: [...state.encaissements, nouvelEncaissement] }));

        const { data, error } = await supabase.from('encaissements').insert(toSupabaseRow(nouvelEncaissement)).select().single();
        if (error) {
          logger.error('Supabase addEncaissement:', error.message);
          notifyError('Erreur de sauvegarde', `Impossible de créer l'encaissement: ${error.message}`);
          return nouvelEncaissement;
        }

        if (data) {
          const encaissementAvecId = { ...nouvelEncaissement, id: data.id };
          set((state) => ({
            encaissements: state.encaissements.map((e) => e.id === nouvelEncaissement.id ? encaissementAvecId : e)
          }));

          // 🔄 Synchroniser automatiquement avec le journal de caisse
          await get().syncEncaissementToJournal(encaissementAvecId);

          return encaissementAvecId;
        }

        return nouvelEncaissement;
      },

      syncEncaissementToJournal: async (encaissement) => {
        try {
          // Vérifier si déjà synchronisé
          if (encaissement.mouvementCaisseId) {
            logger.log('Encaissement déjà synchronisé:', encaissement.id);
            return;
          }

          // Récupérer les infos de la facture pour le libellé
          const { data: facture } = await supabase
            .from('factures')
            .select('numero, objet, client_nom')
            .eq('id', encaissement.factureId)
            .single();

          const mouvement = {
            date: encaissement.dateEncaissement || new Date().toISOString().split('T')[0],
            type: 'ENTREE',
            categorie: 'PAIEMENT_CLIENT',
            montant: encaissement.montant,
            description: `[ENCAISSEMENT] ${facture?.numero || 'FACTURE'} - ${encaissement.clientNom || facture?.client_nom || 'Client'}`,
            beneficiaire: encaissement.clientNom || facture?.client_nom || 'Client',
            mode_paiement: encaissement.modePaiement || 'VIREMENT',
            piece_justificative: encaissement.reference || `ENC-${encaissement.id}`,
            utilisateur: 'Système',
            date_creation: new Date().toISOString()
          };

          const { data: mvt, error: mvtError } = await supabase
            .from('mouvements_caisse')
            .insert(mouvement)
            .select()
            .single();

          if (mvtError) {
            logger.error('Erreur sync journal:', mvtError.message);
            notifyError('Erreur synchronisation', 'Impossible de synchroniser avec le journal de caisse');
            return;
          }

          // Mettre à jour l'encaissement avec la référence du mouvement
          const { error: updError } = await supabase
            .from('encaissements')
            .update({ mouvement_caisse_id: mvt.id })
            .eq('id', encaissement.id);

          if (updError) {
            logger.error('Erreur mise à jour encaissement:', updError.message);
          } else {
            // Mettre à jour le store local
            set((state) => ({
              encaissements: state.encaissements.map((e) =>
                e.id === encaissement.id ? { ...e, mouvementCaisseId: mvt.id } : e
              )
            }));
            logger.log('✅ Encaissement synchronisé avec le journal:', mvt.id);
          }
        } catch (err) {
          logger.error('Erreur syncEncaissementToJournal:', err);
        }
      },

      updateEncaissement: (id, modifications) => {
        set((state) => ({
          encaissements: state.encaissements.map((e) => e.id === id ? { ...e, ...modifications } : e)
        }));

        const encMaj = get().encaissements.find((e) => e.id === id);
        if (encMaj) {
          supabase.from('encaissements').update(toSupabaseRow({ ...encMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) {
              logger.error('Supabase updateEncaissement:', error.message);
              notifyError('Erreur de mise à jour', `Impossible de modifier l'encaissement: ${error.message}`);
            }
          }).catch((err) => {
            logger.error('Erreur updateEncaissement:', err.message);
          });
        }
      },

      deleteEncaissement: (id) => {
        set((state) => ({ encaissements: state.encaissements.filter((e) => e.id !== id) }));
        supabase.from('encaissements').delete().eq('id', id).then(({ error }) => {
          if (error) {
            logger.error('Supabase deleteEncaissement:', error.message);
            notifyError('Erreur de suppression', `Impossible de supprimer l'encaissement: ${error.message}`);
          }
        }).catch((err) => {
          logger.error('Erreur deleteEncaissement:', err.message);
        });
      },

      getEncaissementById: (id) => {
        const { encaissements } = get();
        return encaissements.find((e) => e.id === id);
      },

      getEncaissementsByFacture: (factureId) => {
        const { encaissements } = get();
        return encaissements.filter((e) => e.factureId === factureId);
      },

      getEncaissementsByClient: (clientId) => {
        const { encaissements } = get();
        return encaissements.filter((e) => e.clientId === clientId);
      },

      getEncaissementsByPeriode: (dateDebut, dateFin) => {
        const { encaissements } = get();
        return encaissements.filter((e) => {
          const date = e.dateEncaissement;
          return date >= dateDebut && date <= dateFin;
        });
      },

      getEncaissementsByModePaiement: (modePaiement) => {
        const { encaissements } = get();
        return encaissements.filter((e) => e.modePaiement === modePaiement);
      },

      getTotalEncaissements: () => {
        const { encaissements } = get();
        return encaissements.reduce((total, e) => total + (e.montant || 0), 0);
      },

      getSoldeTotal: () => {
        const { soldeInitial } = get();
        const totalEncaissements = get().getTotalEncaissements();
        return soldeInitial + totalEncaissements;
      },

      setSoldeInitial: (montant) => {
        set({ soldeInitial: montant });
      },

      setEncaissements: (encaissements) => { set({ encaissements }); },

      // Fonctions pour Realtime (pas d'appel Supabase pour éviter boucle)
      addEncaissementFromRealtime: (encaissement) => {
        const { encaissements } = get();
        const existing = encaissements.find(e => e.id === encaissement.id);
        if (!existing) {
          set({ encaissements: [...encaissements, encaissement] });
        }
      }
    }),
    {
      name: 'sika_encaissements'
    }
  )
);
