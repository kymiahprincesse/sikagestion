import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { crudSuccess, crudError } from '../utils/crudNotify';
import { logger } from '../utils/logger';
import { generateSecureId } from '../utils/format';

function ecritureToRow(e) {
  return {
    date: e.date || new Date().toISOString().split('T')[0],
    piece_comptable: e.pieceComptable || null,
    type: e.type || null,
    compte_debit: e.compteDebit || null,
    compte_credit: e.compteCredit || null,
    montant_debit: e.montantDebit || 0,
    montant_credit: e.montantCredit || 0,
    libelle: e.libelle || null,
    notes: e.notes || null,
  };
}

export const useJournalStore = create(
  persist(
    (set, get) => ({
      ecritures: [],

      addEcriture: async (ecriture) => {
        const nouvelleEcriture = {
          ...ecriture,
          id: generateSecureId('ECR'),
          date: ecriture.date || new Date().toISOString().split('T')[0],
          pieceComptable: ecriture.pieceComptable || `PC-${generateSecureId('pc')}`
        };

        set((state) => ({ ecritures: [...state.ecritures, nouvelleEcriture] }));

        const { data, error } = await supabase.from('ecritures_journal').insert(ecritureToRow(nouvelleEcriture)).select().single();
        if (error) {
          console.error('Supabase addEcriture:', error.message);
          crudError(`Impossible de créer l'écriture : ${error.message}`);
        } else if (data) {
          crudSuccess('Écriture comptable enregistrée');
          set((state) => ({
            ecritures: state.ecritures.map((e) => e.id === nouvelleEcriture.id ? { ...e, id: data.id } : e)
          }));
          return { ...nouvelleEcriture, id: data.id };
        }

        return nouvelleEcriture;
      },

      updateEcriture: (id, modifications) => {
        set((state) => ({
          ecritures: state.ecritures.map((e) => e.id === id ? { ...e, ...modifications } : e)
        }));

        const eMaj = get().ecritures.find((e) => e.id === id);
        if (eMaj) {
          supabase.from('ecritures_journal').update(ecritureToRow({ ...eMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) {
              logger.error('Supabase updateEcriture:', error.message);
              crudError(`Impossible de modifier l'écriture : ${error.message}`);
            } else {
              crudSuccess('Écriture comptable modifiée');
            }
          }).catch((err) => {
            logger.error('Erreur updateEcriture:', err.message);
            crudError(`Impossible de modifier l'écriture : ${err.message}`);
          });
        }
      },

      deleteEcriture: (id) => {
        set((state) => ({ ecritures: state.ecritures.filter((e) => e.id !== id) }));
        supabase.from('ecritures_journal').delete().eq('id', id).then(({ error }) => {
          if (error) {
            logger.error('Supabase deleteEcriture:', error.message);
            crudError(`Impossible de supprimer l'écriture : ${error.message}`);
          } else {
            crudSuccess('Écriture comptable supprimée');
          }
        }).catch((err) => {
          logger.error('Erreur deleteEcriture:', err.message);
          crudError(`Impossible de supprimer l'écriture : ${err.message}`);
        });
      },

      getEcritureById: (id) => {
        const { ecritures } = get();
        return ecritures.find((e) => e.id === id);
      },

      getEcrituresByPeriode: (dateDebut, dateFin) => {
        const { ecritures } = get();
        return ecritures.filter((e) => {
          const date = e.date;
          return date >= dateDebut && date <= dateFin;
        });
      },

      getEcrituresByCompte: (numeroCompte) => {
        const { ecritures } = get();
        return ecritures.filter((e) => 
          e.compteDebit === numeroCompte || e.compteCredit === numeroCompte
        );
      },

      getEcrituresByType: (type) => {
        const { ecritures } = get();
        return ecritures.filter((e) => e.type === type);
      },

      getTotalDebit: () => {
        const { ecritures } = get();
        return ecritures.reduce((total, e) => total + (e.montantDebit || 0), 0);
      },

      getTotalCredit: () => {
        const { ecritures } = get();
        return ecritures.reduce((total, e) => total + (e.montantCredit || 0), 0);
      },

      getSoldeCompte: (numeroCompte) => {
        const ecritures = get().getEcrituresByCompte(numeroCompte);
        const debit = ecritures.reduce((total, e) => 
          e.compteDebit === numeroCompte ? total + (e.montantDebit || 0) : total, 0
        );
        const credit = ecritures.reduce((total, e) => 
          e.compteCredit === numeroCompte ? total + (e.montantCredit || 0) : total, 0
        );
        return debit - credit;
      },

      verifierEquilibre: () => {
        const totalDebit = get().getTotalDebit();
        const totalCredit = get().getTotalCredit();
        return Math.abs(totalDebit - totalCredit) < 0.01; // Tolérance pour erreurs d'arrondi
      },

      setEcritures: (ecritures) => {
        set({ ecritures });
      },

      // Realtime handlers (sans appel Supabase pour éviter boucle)
      addEcritureFromRealtime: (ecriture) => {
        const { ecritures } = get();
        if (!ecritures.find((e) => e.id === ecriture.id)) {
          set({ ecritures: [ecriture, ...ecritures] });
        }
      },

      updateEcritureFromRealtime: (ecriture) => {
        set((state) => ({
          ecritures: state.ecritures.map((e) => e.id === ecriture.id ? { ...e, ...ecriture } : e),
        }));
      },

      deleteEcritureFromRealtime: (id) => {
        set((state) => ({ ecritures: state.ecritures.filter((e) => e.id !== id) }));
      }
    }),
    {
      name: 'sika_journal',
      partialize: () => ({})
    }
  )
);
