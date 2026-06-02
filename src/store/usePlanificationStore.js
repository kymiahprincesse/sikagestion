import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { notifyError } from '../utils/notifications';
import { logger } from '../utils/logger';
import { useCaisseStore } from './useCaisseStore';
import { useDevisStore } from './useDevisStore';

function projetToRow(p) {
  return {
    nom: p.nom,
    client_id: p.clientId || null,
    reference_projet: p.referenceProjet || null,
    date_debut: p.dateDebut || null,
    date_fin_prevue: p.dateFinPrevue || null,
    date_fin_reelle: p.dateFinReelle || null,
    budget_prevu: p.budgetPrevu || 0,
    cout_reel: p.coutReel || 0,
    statut: p.statut || 'EN_PREPARATION',
    description: p.description || null,
  };
}

function tacheToRow(t) {
  return {
    projet_id: t.projetId || null,
    nom: t.nom,
    description: t.description || null,
    statut: t.statut || 'A_FAIRE',
    date_debut: t.dateDebut || null,
    date_fin_prevue: t.dateFinPrevue || null,
    date_fin_reelle: t.dateFinReelle || null,
    responsable: t.responsable || null,
    budget_prevu: t.budgetPrevu || 0,
    budget_reel: t.budgetReel || 0,
    nb_techniciens: t.nbTechniciens || 1,
    km_site: t.kmSite || 0,
    nb_deplacements: t.nbDeplacements || 0,
    budget_materiel: t.budgetMateriel || 0,
    budget_sous_traitance: t.budgetSousTraitance || 0,
    budget_carburant: t.budgetCarburant || 0,
    budget_nourriture: t.budgetNourriture || 0,
    budget_logistique: t.budgetLogistique || 0,
    cout_total: t.coutTotal || 0,
    priorite: t.priorite || null,
    notes: t.notes || null,
  };
}

function ressourceToRow(r) {
  return {
    projet_id: r.projetId || null,
    tache_id: r.tacheId || null,
    semaine: r.semaine || null,
    technicien: r.technicien || null,
    heures_prevu: r.heuresPrevu || 0,
    heures_reel: r.heuresReel || 0,
    notes: r.notes || null,
  };
}

export const STATUTS_PROJET = {
  EN_PREPARATION: 'EN_PREPARATION',
  EN_COURS: 'EN_COURS',
  TERMINE: 'TERMINE',
  EN_RETARD: 'EN_RETARD',
  SUSPENDU: 'SUSPENDU'
};

export const STATUTS_TACHE = {
  A_FAIRE: 'A_FAIRE',
  EN_COURS: 'EN_COURS',
  TERMINE: 'TERMINE',
  EN_RETARD: 'EN_RETARD',
  BLOQUE: 'BLOQUE',
  SUSPENDU: 'SUSPENDU'
};

export const usePlanificationStore = create(
  persist(
    (set, get) => ({
      projets: [],
      taches: [],
      ressourcesHebdo: [],
      seuilAlerteBudget: 0.8,

      // Gestion des projets
      addProjet: async (projet) => {
        const nouveauProjet = {
          ...projet,
          id: Date.now(),
          dateCreation: projet.dateCreation || new Date().toISOString().split('T')[0],
          statut: projet.statut || STATUTS_PROJET.EN_PREPARATION
        };

        set((state) => ({ projets: [...state.projets, nouveauProjet] }));

        const { data, error } = await supabase.from('projets').insert(projetToRow(nouveauProjet)).select().single();
        if (error) {
          console.error('Supabase addProjet:', error.message);
          notifyError('Erreur de sauvegarde', `Impossible de créer le projet: ${error.message}`);
        } else if (data) {
          set((state) => ({
            projets: state.projets.map((p) => p.id === nouveauProjet.id ? { ...p, id: data.id } : p)
          }));
          return { ...nouveauProjet, id: data.id };
        }

        return nouveauProjet;
      },

      updateProjet: (id, modifications, utilisateur = 'Utilisateur') => {
        const projet = get().getProjetById(id);
        const projetAvant = { ...projet };
        
        set((state) => ({
          projets: state.projets.map((p) =>
            p.id === id ? { ...p, ...modifications } : p
          )
        }));
        
        const projetApres = get().getProjetById(id);

        supabase.from('projets').update(projetToRow({ ...projet, ...modifications })).eq('id', id).then(({ error }) => {
          if (error) {
            console.error('Supabase updateProjet:', error.message);
            notifyError('Erreur de mise à jour', `Impossible de modifier le projet: ${error.message}`);
          }
        });

        if (typeof window !== 'undefined' && projet) {
          // Notification
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().notifierModificationPlanning(
              utilisateur,
              projet.nom || `Projet #${id}`
            );
          });
          
          // Audit Trail avec calcul d'impact financier
          import('./useAuditStore').then(({ useAuditStore, ACTIONS_AUDIT, MODULES_AUDIT, calculerEcartFinancier }) => {
            const impactFinancier = calculerEcartFinancier(projetAvant, projetApres);
            
            useAuditStore.getState().addLog({
              module: MODULES_AUDIT.PLANIFICATION,
              action: ACTIONS_AUDIT.PLANNING_UPDATE,
              utilisateur: utilisateur,
              avant: projetAvant,
              apres: projetApres,
              impactFinancier: impactFinancier
            });
          });
        }
      },

      deleteProjet: (id) => {
        set((state) => ({
          projets: state.projets.filter((p) => p.id !== id),
          taches: state.taches.filter((t) => t.projetId !== id),
          ressourcesHebdo: state.ressourcesHebdo.filter((r) => r.projetId !== id)
        }));
        supabase.from('projets').delete().eq('id', id).then(({ error }) => {
          if (error) {
            console.error('Supabase deleteProjet:', error.message);
            notifyError('Erreur de suppression', `Impossible de supprimer le projet: ${error.message}`);
          }
        });
      },

      getProjetById: (id) => {
        const { projets } = get();
        return projets.find((p) => p.id === id);
      },

      getProjetsByClient: (clientId) => {
        const { projets } = get();
        return projets.filter((p) => p.clientId === clientId);
      },

      getProjetsByStatut: (statut) => {
        const { projets } = get();
        return projets.filter((p) => p.statut === statut);
      },

      // Gestion des tâches
      addTache: async (tache) => {
        const nouvelleTache = {
          ...tache,
          id: Date.now(),
          dateCreation: tache.dateCreation || new Date().toISOString().split('T')[0],
          statut: tache.statut || 'A_FAIRE'
        };

        set((state) => ({ taches: [...state.taches, nouvelleTache] }));

        const { data, error } = await supabase.from('taches').insert(tacheToRow(nouvelleTache)).select().single();
        if (error) {
          console.error('Supabase addTache:', error.message);
          notifyError('Erreur de sauvegarde', `Impossible de créer la tâche: ${error.message}`);
        } else if (data) {
          set((state) => ({
            taches: state.taches.map((t) => t.id === nouvelleTache.id ? { ...t, id: data.id } : t)
          }));
          return { ...nouvelleTache, id: data.id };
        }

        return nouvelleTache;
      },

      updateTache: (id, modifications) => {
        set((state) => ({
          taches: state.taches.map((t) => t.id === id ? { ...t, ...modifications } : t)
        }));

        const tacheMaj = get().taches.find((t) => t.id === id);
        if (tacheMaj) {
          supabase.from('taches').update(tacheToRow({ ...tacheMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) {
              console.error('Supabase updateTache:', error.message);
              notifyError('Erreur de mise à jour', `Impossible de modifier la tâche: ${error.message}`);
            }
          });
        }
      },

      deleteTache: (id) => {
        set((state) => ({
          taches: state.taches.filter((t) => t.id !== id),
          ressourcesHebdo: state.ressourcesHebdo.filter((r) => r.tacheId !== id)
        }));
        supabase.from('taches').delete().eq('id', id).then(({ error }) => {
          if (error) {
            console.error('Supabase deleteTache:', error.message);
            notifyError('Erreur de suppression', `Impossible de supprimer la tâche: ${error.message}`);
          }
        });
      },

      getTacheById: (id) => {
        const { taches } = get();
        return taches.find((t) => t.id === id);
      },

      getTachesByProjet: (projetId) => {
        const { taches } = get();
        return taches.filter((t) => t.projetId === projetId);
      },

      getTachesByStatut: (statut) => {
        const { taches } = get();
        return taches.filter((t) => t.statut === statut);
      },

      // Gestion des ressources hebdomadaires
      addRessource: async (ressource) => {
        const nouvelleRessource = { ...ressource, id: Date.now() };

        set((state) => ({ ressourcesHebdo: [...state.ressourcesHebdo, nouvelleRessource] }));

        const { data, error } = await supabase.from('ressources_hebdo').insert(ressourceToRow(nouvelleRessource)).select().single();
        if (error) {
          console.error('Supabase addRessource:', error.message);
          notifyError('Erreur de sauvegarde', `Impossible de créer la ressource: ${error.message}`);
        } else if (data) {
          set((state) => ({
            ressourcesHebdo: state.ressourcesHebdo.map((r) => r.id === nouvelleRessource.id ? { ...r, id: data.id } : r)
          }));
          return { ...nouvelleRessource, id: data.id };
        }

        return nouvelleRessource;
      },

      updateRessource: (id, modifications) => {
        set((state) => ({
          ressourcesHebdo: state.ressourcesHebdo.map((r) => r.id === id ? { ...r, ...modifications } : r)
        }));

        const rMaj = get().ressourcesHebdo.find((r) => r.id === id);
        if (rMaj) {
          supabase.from('ressources_hebdo').update(ressourceToRow({ ...rMaj, ...modifications })).eq('id', id).then(({ error }) => {
            if (error) {
              console.error('Supabase updateRessource:', error.message);
              notifyError('Erreur de mise à jour', `Impossible de modifier la ressource: ${error.message}`);
            }
          });
        }
      },

      deleteRessource: (id) => {
        set((state) => ({ ressourcesHebdo: state.ressourcesHebdo.filter((r) => r.id !== id) }));
        supabase.from('ressources_hebdo').delete().eq('id', id).then(({ error }) => {
          if (error) {
            console.error('Supabase deleteRessource:', error.message);
            notifyError('Erreur de suppression', `Impossible de supprimer la ressource: ${error.message}`);
          }
        });
      },

      getRessourcesByTache: (tacheId) => {
        const { ressourcesHebdo } = get();
        return ressourcesHebdo.filter((r) => r.tacheId === tacheId);
      },

      getRessourcesByProjet: (projetId) => {
        const { ressourcesHebdo } = get();
        return ressourcesHebdo.filter((r) => r.projetId === projetId);
      },

      // Calculs budgétaires
      calculerBudgetTotal: (projetId) => {
        const taches = get().getTachesByProjet(projetId);
        return taches.reduce((total, tache) => {
          const budgetTache = tache.budgetPrevu || 0;
          return total + budgetTache;
        }, 0);
      },

      calculerBudgetReel: (projetId) => {
        const taches = get().getTachesByProjet(projetId);
        return taches.reduce((total, tache) => {
          const budgetReel = tache.budgetReel || 0;
          return total + budgetReel;
        }, 0);
      },

      getEcart: (projetId) => {
        const prevu = get().calculerBudgetTotal(projetId);
        const reel = get().calculerBudgetReel(projetId);
        const ecart = reel - prevu;
        const pourcentage = prevu > 0 ? (ecart / prevu) * 100 : 0;

        return {
          prevu,
          reel,
          ecart,
          pourcentage: Math.round(pourcentage * 100) / 100
        };
      },

      // Calcul des ressources totales
      getTotalHeuresPrevu: (projetId) => {
        const ressources = get().getRessourcesByProjet(projetId);
        return ressources.reduce((total, r) => total + (r.heuresPrevu || 0), 0);
      },

      getTotalHeuresReel: (projetId) => {
        const ressources = get().getRessourcesByProjet(projetId);
        return ressources.reduce((total, r) => total + (r.heuresReel || 0), 0);
      },

      // Avancement du projet
      getAvancementProjet: (projetId) => {
        const taches = get().getTachesByProjet(projetId);
        if (taches.length === 0) return 0;

        const tachesTerminees = taches.filter((t) => t.statut === 'TERMINE');
        return Math.round((tachesTerminees.length / taches.length) * 100);
      },

      // Calculs budgétaires avancés pour tâches
      calculerBudgetTache: (tache, parametres) => {
        if (!tache || !parametres) return null;

        const dureeJours = tache.dureeJours || 0;
        const nbTechniciens = tache.nbTechniciens || 1;
        const kmSite = tache.kmSite || 0;
        const nbDeplacements = tache.nbDeplacements || 0;
        const budgetMateriel = tache.budgetMateriel || 0;
        const budgetSousTraitance = tache.budgetSousTraitance || 0;

        const budgetCarburant = (kmSite * 2 * nbDeplacements / 100) 
          * parametres.consommationMoyenne 
          * parametres.prixCarburant;

        const budgetNourriture = nbTechniciens * dureeJours * parametres.indemniteRepas;

        const budgetLogistique = budgetMateriel + budgetSousTraitance;

        const coutHebdo = budgetNourriture 
          + (nbDeplacements * kmSite * 2 / 100 * parametres.consommationMoyenne * parametres.prixCarburant)
          + budgetLogistique;

        const coutTotal = budgetCarburant + budgetNourriture + budgetLogistique;

        return {
          budgetCarburant: Math.round(budgetCarburant),
          budgetNourriture: Math.round(budgetNourriture),
          budgetLogistique: Math.round(budgetLogistique),
          coutHebdo: Math.round(coutHebdo),
          coutTotal: Math.round(coutTotal)
        };
      },

      // Récupérer coût réel depuis caisse
      getCoutReelProjet: (projetId, referenceProjet) => {
        try {
          const mouvements = useCaisseStore.getState().mouvements || [];
          return mouvements
            .filter(m => m.type === 'SORTIE' && m.referenceProjet === referenceProjet)
            .reduce((total, m) => total + (m.montant || 0), 0);
        } catch (err) {
          logger.warn('[Planification] Erreur calcul coût réel projet:', err?.message);
          return 0;
        }
      },

      // Récupérer budget prévu depuis devis
      getBudgetPrevuDevis: (devisId) => {
        if (!devisId) return 0;
        try {
          const devis = useDevisStore.getState().getDevisById(devisId);
          return devis?.montantTotal || 0;
        } catch (err) {
          logger.warn('[Planification] Erreur récupération budget devis:', err?.message);
          return 0;
        }
      },

      // Vérifier alerte 80% budget
      verifierAlerteBudget: (projetId) => {
        const projet = get().getProjetById(projetId);
        if (!projet) return null;

        const budgetPrevu = projet.budgetPrevu || get().getBudgetPrevuDevis(projet.devisId);
        const coutReel = projet.coutReel || get().getCoutReelProjet(projetId, projet.referenceProjet);
        
        if (budgetPrevu === 0) return null;

        const pourcentageConsomme = (coutReel / budgetPrevu) * 100;
        const seuil = get().seuilAlerteBudget * 100;

        if (pourcentageConsomme >= seuil) {
          return {
            projetId,
            projetNom: projet.nom,
            clientId: projet.clientId,
            budgetPrevu,
            coutReel,
            pourcentageConsomme: Math.round(pourcentageConsomme * 100) / 100,
            seuil,
            niveau: pourcentageConsomme >= 100 ? 'CRITIQUE' : pourcentageConsomme >= 90 ? 'URGENT' : 'ALERTE'
          };
        }

        return null;
      },

      // Déclencher alerte automatique
      declencherAlerteBudget: (alerte, utilisateur = 'Système') => {
        if (!alerte || typeof window === 'undefined') return;

        try {
          // Notification
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().addNotification({
              type: 'ALERTE_BUDGET',
              titre: `⚠️ ALERTE BUDGET - ${alerte.projetNom}`,
              message: `Budget consommé à ${alerte.pourcentageConsomme}% | Prévu: ${alerte.budgetPrevu.toLocaleString('fr-FR')} FCFA | Dépensé: ${alerte.coutReel.toLocaleString('fr-FR')} FCFA`,
              niveau: alerte.niveau,
              projetId: alerte.projetId
            });
          });

          // Audit
          import('./useAuditStore').then(({ useAuditStore, ACTIONS_AUDIT, MODULES_AUDIT }) => {
            useAuditStore.getState().addLog({
              module: MODULES_AUDIT.PLANIFICATION,
              action: ACTIONS_AUDIT.ALERTE_BUDGET,
              utilisateur,
              details: `Projet ${alerte.projetNom} - Budget consommé à ${alerte.pourcentageConsomme}%`,
              impactFinancier: alerte.coutReel - alerte.budgetPrevu
            });
          });
        } catch (error) {
          console.error('Erreur déclenchement alerte:', error);
        }
      },

      // Vérifier toutes les alertes
      verifierToutesAlertes: () => {
        const { projets } = get();
        const alertes = [];

        projets.forEach(projet => {
          if (projet.statut !== STATUTS_PROJET.TERMINE && projet.statut !== STATUTS_PROJET.SUSPENDU) {
            const alerte = get().verifierAlerteBudget(projet.id);
            if (alerte) {
              alertes.push(alerte);
              get().declencherAlerteBudget(alerte);
            }
          }
        });

        return alertes;
      },

      // Import planning depuis fichier
      importerTaches: (tachesImportees, projetId) => {
        const tachesAjoutees = [];

        tachesImportees.forEach(tacheData => {
          const nouvelleTache = get().addTache({
            ...tacheData,
            projetId,
            statut: tacheData.statut || STATUTS_TACHE.A_FAIRE
          });
          tachesAjoutees.push(nouvelleTache);
        });

        return tachesAjoutees;
      },

      // Mise à jour seuil alerte
      setSeuilAlerteBudget: (seuil) => {
        if (seuil > 0 && seuil <= 1) {
          set({ seuilAlerteBudget: seuil });
        }
      },

      // Statistiques projet
      getStatistiquesProjet: (projetId) => {
        const projet = get().getProjetById(projetId);
        const taches = get().getTachesByProjet(projetId);
        
        if (!projet) return null;

        const budgetPrevu = projet.budgetPrevu || get().getBudgetPrevuDevis(projet.devisId);
        const coutReel = projet.coutReel || get().getCoutReelProjet(projetId, projet.referenceProjet);
        const ecart = coutReel - budgetPrevu;
        const pourcentageConsomme = budgetPrevu > 0 ? (coutReel / budgetPrevu) * 100 : 0;

        const tachesTerminees = taches.filter(t => t.statut === STATUTS_TACHE.TERMINE).length;
        const tachesEnCours = taches.filter(t => t.statut === STATUTS_TACHE.EN_COURS).length;
        const tachesEnRetard = taches.filter(t => t.statut === STATUTS_TACHE.EN_RETARD).length;

        return {
          projetId,
          nom: projet.nom,
          budgetPrevu,
          coutReel,
          ecart,
          pourcentageConsomme: Math.round(pourcentageConsomme * 100) / 100,
          nbTaches: taches.length,
          tachesTerminees,
          tachesEnCours,
          tachesEnRetard,
          avancement: get().getAvancementProjet(projetId),
          indicateurBudget: pourcentageConsomme < 60 ? 'ECONOME' : pourcentageConsomme < 80 ? 'ALERTE' : 'DEPASSEMENT'
        };
      }
,

      setProjets: (projets) => { set({ projets }); },
      setTaches: (taches) => { set({ taches }); },
      setRessourcesHebdo: (ressourcesHebdo) => { set({ ressourcesHebdo }); },

      // Fonctions pour Realtime (pas d'appel Supabase pour éviter boucle)
      addProjetFromRealtime: (projet) => {
        const { projets } = get();
        const existing = projets.find(p => p.id === projet.id);
        if (!existing) {
          set({ projets: [...projets, projet] });
        }
      },

      addTacheFromRealtime: (tache) => {
        const { taches } = get();
        const existing = taches.find(t => t.id === tache.id);
        if (!existing) {
          set({ taches: [...taches, tache] });
        }
      },

      addRessourceFromRealtime: (ressource) => {
        const { ressourcesHebdo } = get();
        const existing = ressourcesHebdo.find(r => r.id === ressource.id);
        if (!existing) {
          set({ ressourcesHebdo: [...ressourcesHebdo, ressource] });
        }
      }
    }),
    {
      name: 'sika_planification'
    }
  )
);
