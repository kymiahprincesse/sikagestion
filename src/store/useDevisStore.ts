import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { formatFCFA, getTodayISO, generateSecureId } from '../utils/format';
import { quickCheck, findAllDuplicates, mergeDuplicates } from '../utils/duplicateDetector';
import { logger } from '../utils/logger';
import { crudSuccess, crudError } from '../utils/crudNotify';
import { normalizeDevisStatut, detecterTypeDevis } from '../utils/devisStatus';
import { Devis } from '../types';

function toSupabaseRow(devis: Partial<Devis> & Record<string, any>) {
  return {
    numero: devis.numero,
    client_id: devis.clientId || null,
    client_nom: devis.clientNom || null,
    type_devis: devis.typeDevis || devis.type || detecterTypeDevis(devis),
    objet: devis.objet || null,
    montant_ht: devis.montantHT || 0,
    montant_tva: devis.montantTVA || 0,
    montant_ttc: devis.montantTTC || 0,
    montant_total: devis.montantTotal || devis.montantTTC || 0,
    statut: devis.statut || 'BROUILLON',
    date_devis: devis.dateDevis || getTodayISO(),
    date_validation: devis.dateValidation || null,
    date_annulation: devis.dateAnnulation || null,
    date_transformation: devis.dateTransformation || null,
    notes: devis.notes || null,
  };
}

export interface DevisStoreState {
  devis: any[];
  compteurGlobal: number;
  getNextNumero: () => string;
  incrementCompteur: () => void;
  addDevis: (devis: any, options?: any) => Promise<any>;
  updateDevis: (id: string, modifications: any, options?: any) => Promise<void>;
  deleteDevis: (id: string) => Promise<boolean>;
  getDevisById: (id: string) => any;
  getDevisByNumero: (numero: string) => any;
  getDevisByClient: (clientId: string) => any[];
  getDevisByStatut: (statut: string) => any[];
  validerDevis: (id: string) => void;
  annulerDevis: (id: string) => void;
  transformerEnFacture: (id: string) => void;
  setDevis: (devis: any[]) => void;
  addDevisFromRealtime: (devis: any) => void;
  updateDevisFromRealtime: (devis: any) => void;
  deleteDevisFromRealtime: (id: string) => void;
  analyserDoublons: () => any[];
  fusionnerDoublons: (idsDoublons: string[], idPrincipal: string) => any;
  supprimerDoublons: (idsDoublons: string[], garderId?: string | null) => any;
  vérifierDoublon: (devis: any) => any;
  getDoublonsParClient: (clientId: string) => any[];
  nettoyerDoublonsAuto: (options?: any) => any;
}

export const useDevisStore = create<DevisStoreState>()(
  persist(
    (set, get) => ({
      devis: [],
      compteurGlobal: 990,

      getNextNumero: () => {
        let { compteurGlobal } = get();
        if (compteurGlobal < 990) {
          compteurGlobal = 990;
          setTimeout(() => set({ compteurGlobal: 990 }), 0); // Eviter set pendant le render
        }
        const annee = new Date().getFullYear();
        const numero = `N°${compteurGlobal}/SIKA/${annee}`;
        return numero;
      },

      incrementCompteur: () => {
        set((state) => ({ compteurGlobal: state.compteurGlobal + 1 }));
      },

      addDevis: async (devis, options = {}) => {
        const { ignorerDoublons = false, fusionnerSiDoublon = false } = options;
        
        let numero = devis.numero;
        if (!numero) {
          numero = get().getNextNumero();
          devis.numero = numero;
        }

        // FORCE LA CORRECTION: Auto-générer un nouveau numéro si celui-ci est déjà pris
        if (!devis.id) {
          let localNumero = numero;
          let counter = get().compteurGlobal;
          const annee = new Date().getFullYear();
          
          while (get().devis.some(d => d.numero === localNumero)) {
            counter++;
            localNumero = `N°${counter}/SIKA/${annee}`;
          }
          
          if (localNumero !== numero) {
            set({ compteurGlobal: counter });
            numero = localNumero;
            devis.numero = localNumero;
          }
        }

        // ═══ NOUVEAU SYSTÈME DE DÉTECTION DE DOUBLONS ═══
        // À la demande expresse de l'utilisateur: "rien ne cause des erreurs", on bypass la vérification bloquante
        // pour autoriser la création de devis multiples fluides.
        /*
        if (!ignorerDoublons && !devis.id) {
          const résultatVérification = quickCheck('devis', devis, get().devis);
          
          if (résultatVérification.estDoublon) {
            logger.warn('🚫 DOUBLON DÉTECTÉ:', résultatVérification.raison, résultatVérification);
            
            // Notification utilisateur
            if (typeof window !== 'undefined') {
              import('./useNotificationsStore').then(({ useNotificationsStore }) => {
                const notifStore = useNotificationsStore.getState();
                
                notifStore.ajouterNotification({
                  type: 'ATTENTION',
                  icone: '⚠️',
                  titre: 'DOUBLON DÉTECTÉ',
                  message: `${résultatVérification.raison}. Devis existant: ${résultatVérification.doublonDetecté?.numero || 'N/A'}`,
                  lien: '/devis/liste',
                  donnees: { 
                    devisId: résultatVérification.doublonDetecté?.id,
                    typeDoublon: résultatVérification.type 
                  }
                });
              }).catch((err) => {
                logger.error('Erreur import useNotificationsStore:', err.message);
              });
            }

            // Option: fusionner avec le doublon existant
            if (fusionnerSiDoublon) {
              const fusionné = mergeDuplicates(
                résultatVérification.doublonDetecté,
                [devis],
                'fusionnerDonnées'
              );
              await get().updateDevis(fusionné.id, fusionné);
              return fusionné;
            }

            // Retourner le doublon existant au lieu d'en créer un nouveau
            return résultatVérification.doublonDetecté;
          }
        }
        */
        // ═══════════════════════════════════════════════

        // Incrémentation intelligente du compteur global de devis si c'est un nouveau numéro standard
        const match = numero.match(/N°(\d+)\/SIKA/);
        if (match) {
          const numSeq = parseInt(match[1], 10);
          if (numSeq >= get().compteurGlobal) {
            set({ compteurGlobal: numSeq + 1 });
          }
        } else {
          // Si le numéro n'a pas le format standard, on incrémente pour garder le compteur à jour
          get().incrementCompteur();
        }

        const nouveauDevis = {
          ...devis,
          id: devis.id || generateSecureId('DEV'),
          numero: devis.numero || numero,
          dateCreation: devis.dateCreation || getTodayISO(),
          statut: normalizeDevisStatut(devis.statut || 'BROUILLON'),
          // Ajouter un hash unique pour traçabilité
          hashUnique: generateSecureId('hash')
        };

        set((state) => ({ devis: [...state.devis, nouveauDevis] }));

        // Notifier le tableau de bord de la mise à jour
        if (typeof window !== 'undefined') {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              id: `devis-ajoute-${nouveauDevis.id}`,
              type: 'INFO',
              icone: '📋',
              titre: 'NOUVEAU DEVIS',
              message: `Devis ${nouveauDevis.numero} créé - ${nouveauDevis.montantTTC ? formatFCFA(nouveauDevis.montantTTC) : '0 FCFA'}`,
              lien: '/devis/liste',
              donnees: { devisId: nouveauDevis.id }
            });
          }).catch((err) => {
            logger.error('Erreur import useNotificationsStore:', err.message);
          });
        }

        const { data, error } = await supabase.from('devis').insert(toSupabaseRow(nouveauDevis)).select().single();
        if (error) {
          logger.error('Supabase addDevis:', error.message);
          crudError(`Impossible de créer le devis : ${error.message}`);
        } else if (data) {
          crudSuccess(`Devis ${nouveauDevis.numero} créé avec succès`);
          set((state) => ({
            devis: state.devis.map((d) => d.id === nouveauDevis.id ? { ...d, id: data.id } : d)
          }));
          // Sauvegarder les lignes dans lignes_devis
          if (nouveauDevis.lignes && nouveauDevis.lignes.length > 0) {
            const lignesRows = nouveauDevis.lignes.map((l, idx) => ({
              devis_id: data.id,
              designation: l.designation || '',
              quantite: parseFloat(l.qte) || parseFloat(l.quantite) || parseFloat(l.surface) || parseFloat(l.longueur) || 0,
              ml: parseFloat(l.ml) || parseFloat(l.longueur) || 0,
              pt: parseFloat(l.pt) || 0,
              unite: l.unite || l.typeProfil || l.typeTravail || null,
              pu: parseFloat(l.pu) || 0,
              montant: parseFloat(l.montant) || (parseFloat(l.surface || l.qte || l.quantite || l.longueur || 0) * parseFloat(l.pu || 0)),
              ordre: idx,
            }));
            try {
              const { error: le } = await supabase.from('lignes_devis').insert(lignesRows);
              if (le) logger.error('Supabase lignes_devis insert:', le.message);
            } catch (err) {
              logger.error('Erreur insert lignes_devis:', err.message);
            }
          }
          return { ...nouveauDevis, id: data.id };
        }

        return nouveauDevis;
      },

      updateDevis: async (id, modifications, options = {}) => {
        const normalizedModifications = modifications.statut
          ? { ...modifications, statut: normalizeDevisStatut(modifications.statut) }
          : modifications;

        set((state) => ({
          devis: state.devis.map((d) => d.id === id ? { ...d, ...normalizedModifications } : d)
        }));

        // Notifier le tableau de bord de la mise à jour
        const devisMaj = get().devis.find((d) => d.id === id);
        if (devisMaj && typeof window !== 'undefined') {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              id: `devis-modifie-${id}-${Date.now()}`,
              type: 'INFO',
              icone: '✏️',
              titre: 'DEVIS MODIFIÉ',
              message: `Devis ${devisMaj.numero} mis à jour - ${devisMaj.montantTTC ? formatFCFA(devisMaj.montantTTC) : '0 FCFA'}`,
              lien: '/devis/liste',
              donnees: { devisId: id }
            });
          }).catch((err) => {
            logger.error('Erreur import useNotificationsStore:', err.message);
          });
        }

        const { error } = await supabase.from('devis').update(toSupabaseRow({ ...devisMaj, ...normalizedModifications })).eq('id', id);
        if (error) {
          logger.error('Supabase updateDevis:', error.message);
          crudError(`Impossible de modifier le devis : ${error.message}`);
        } else if (!options.silent) {
          crudSuccess(`Devis ${devisMaj?.numero || ''} modifié avec succès`);
        }
        // Resynchroniser les lignes si modifiées
        const lignesMaj = modifications.lignes || (devisMaj && devisMaj.lignes);
        if (lignesMaj && lignesMaj.length >= 0) {
          try {
            await supabase.from('lignes_devis').delete().eq('devis_id', id);
            if (lignesMaj.length > 0) {
              const lignesRows = lignesMaj.map((l, idx) => ({
                devis_id: id,
                designation: l.designation || '',
                quantite: parseFloat(l.qte) || parseFloat(l.quantite) || parseFloat(l.surface) || parseFloat(l.longueur) || 0,
                ml: parseFloat(l.ml) || parseFloat(l.longueur) || 0,
                pt: parseFloat(l.pt) || 0,
                unite: l.unite || l.typeProfil || l.typeTravail || null,
                pu: parseFloat(l.pu) || 0,
                montant: parseFloat(l.montant) || (parseFloat(l.surface || l.qte || l.quantite || l.longueur || 0) * parseFloat(l.pu || 0)),
                ordre: idx,
              }));
              const { error: le } = await supabase.from('lignes_devis').insert(lignesRows);
              if (le) logger.error('Supabase lignes_devis update:', le.message);
            }
          } catch (err) {
            logger.error('Erreur sync lignes_devis:', err.message);
          }
        }
      },

      deleteDevis: async (id) => {
        const devisSupprime = get().devis.find((d) => d.id === id);

        set((state) => ({ devis: state.devis.filter((d) => d.id !== id) }));

        // Notification de suppression
        if (devisSupprime && typeof window !== 'undefined') {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              type: 'INFO',
              icone: '🗑️',
              titre: 'DEVIS SUPPRIMÉ',
              message: `Le devis ${devisSupprime.numero} a été supprimé`,
              lien: '/devis/liste'
            });
          }).catch((err) => {
            logger.error('Erreur import useNotificationsStore:', err.message);
          });
        }

        try {
          await supabase.from('lignes_devis').delete().eq('devis_id', id);
          const { error } = await supabase.from('devis').delete().eq('id', id);
          if (error) {
            logger.error('Supabase deleteDevis:', error.message);
            crudError(`Impossible de supprimer le devis : ${error.message}`);
            return false;
          }

          crudSuccess(`Devis ${devisSupprime?.numero || ''} supprimé avec succès`);
          return true;
        } catch (err) {
          logger.error('Erreur deleteDevis:', err.message);
          crudError(`Impossible de supprimer le devis : ${err.message}`);
          return false;
        }
      },

      getDevisById: (id) => get().devis.find((d) => d.id === id),
      getDevisByNumero: (numero) => get().devis.find((d) => d.numero === numero),
      getDevisByClient: (clientId) => get().devis.filter((d) => d.clientId === clientId),
      getDevisByStatut: (statut) => get().devis.filter((d) => d.statut === statut),

      validerDevis: (id) => {
        const devis = get().getDevisById(id);
        get().updateDevis(id, { statut: 'VALIDE', dateValidation: getTodayISO() }, { silent: true });
        crudSuccess(`Devis ${devis?.numero || ''} validé`);
      },

      annulerDevis: (id) => {
        const devis = get().getDevisById(id);
        get().updateDevis(id, { statut: 'ANNULE', dateAnnulation: getTodayISO() }, { silent: true });
        crudSuccess(`Devis ${devis?.numero || ''} annulé`);
      },

      transformerEnFacture: (id) => {
        const devis = get().getDevisById(id);
        get().updateDevis(id, { statut: 'FACTURE', dateTransformation: getTodayISO() }, { silent: true });
        crudSuccess(`Devis ${devis?.numero || ''} transformé en facture`);
        if (typeof window !== 'undefined' && devis) {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().notifierDevisConverti(devis.numero);
          }).catch((err) => {
            logger.error('Erreur import useNotificationsStore:', err.message);
          });
        }
      },

      setDevis: (devis) => {
        set({ devis: devis.map((d) => ({ ...d, statut: normalizeDevisStatut(d.statut) })) });
      },

      // Fonctions pour Realtime (pas d'appel Supabase pour éviter boucle)
      addDevisFromRealtime: (devis) => {
        const { devis: currentDevis } = get();
        const existing = currentDevis.find(d => d.id === devis.id);
        if (!existing) {
          // Vérifier aussi les doublons en temps réel
          const résultat = quickCheck('devis', devis, currentDevis);
          if (!résultat.estDoublon) {
            set({ devis: [...currentDevis, devis] });
          } else {
            logger.log('Devis realtime ignoré (doublon):', devis.numero);
          }
        }
      },

      updateDevisFromRealtime: (devis) => {
        set((state) => ({
          devis: state.devis.map((d) => d.id === devis.id ? { ...d, ...devis } : d)
        }));
      },

      deleteDevisFromRealtime: (id) => {
        set((state) => ({ devis: state.devis.filter((d) => d.id !== id) }));
      },

      // ═══ NOUVELLES FONCTIONS DE GESTION DES DOUBLONS ═══
      
      /**
       * Analyse complète des doublons dans tous les devis
       */
      analyserDoublons: () => {
        const doublons = findAllDuplicates(get().devis, 'devis');
        logger.log(`📊 Analyse des doublons: ${doublons.length} groupes trouvés`);
        
        if (doublons.length > 0 && typeof window !== 'undefined') {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              type: 'INFO',
              icone: '🔍',
              titre: 'ANALYSE DES DOUBLONS',
              message: `${doublons.length} groupe(s) de devis en doublon détecté(s). Cliquez pour voir.`,
              lien: '/devis/liste?filter=doublons',
              donnees: { doublons, type: 'ANALYSE_DOUBLONS' }
            });
          }).catch((err) => {
            logger.error('Erreur import useNotificationsStore:', err.message);
          });
        }
        
        return doublons;
      },

      /**
       * Fusionne un groupe de devis en doublon
       */
      fusionnerDoublons: (idsDoublons, idPrincipal) => {
        const { devis } = get();
        const entitésDoublons = idsDoublons.map(id => devis.find(d => d.id === id)).filter(Boolean);
        const entitéPrincipale = devis.find(d => d.id === idPrincipal) || entitésDoublons[0];
        
        if (entitésDoublons.length < 2) {
          logger.warn('Fusion impossible: moins de 2 devis');
          return null;
        }

        const fusionné = mergeDuplicates(entitéPrincipale, entitésDoublons.filter(d => d.id !== idPrincipal), 'fusionnerDonnées');
        
        // Supprimer les doublons
        idsDoublons.filter(id => id !== idPrincipal).forEach(id => {
          get().deleteDevis(id);
        });

        // Mettre à jour le principal
        get().updateDevis(idPrincipal, fusionné);

        logger.log('✅ Devis fusionnés:', idsDoublons, '->', idPrincipal);
        
        if (typeof window !== 'undefined') {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              type: 'INFO',
              icone: '🔗',
              titre: 'DEVIS FUSIONNÉS',
              message: `${entitésDoublons.length} devis fusionnés en un seul: ${fusionné.numero}`,
              lien: '/devis/liste'
            });
          }).catch((err) => {
            logger.error('Erreur import useNotificationsStore:', err.message);
          });
        }

        return fusionné;
      },

      /**
       * Supprime tous les doublons d'un groupe (garde le premier)
       */
      supprimerDoublons: (idsDoublons, garderId = null) => {
        const idAGarder = garderId || idsDoublons[0];
        const idsASupprimer = idsDoublons.filter(id => id !== idAGarder);
        
        idsASupprimer.forEach(id => get().deleteDevis(id));
        
        logger.log('🗑️ Doublons supprimés:', idsASupprimer, '- Gardé:', idAGarder);
        
        return { supprimés: idsASupprimer, gardé: idAGarder };
      },

      /**
       * Vérifie rapidement si un devis serait un doublon (sans l'ajouter)
       */
      vérifierDoublon: (devis) => {
        return quickCheck('devis', devis, get().devis);
      },

      /**
       * Récupère les devis en doublon pour un client spécifique
       */
      getDoublonsParClient: (clientId) => {
        const devisClient = get().devis.filter(d => d.clientId === clientId);
        return findAllDuplicates(devisClient, 'devis');
      },

      /**
       * Nettoyage automatique des doublons (à exécuter périodiquement)
       */
      nettoyerDoublonsAuto: (options = {}) => {
        const { 
          seuilTempsMinutes = 5,
          fusionner = false,
          notifier = true 
        } = options;
        
        const doublons = findAllDuplicates(get().devis, 'devis');
        let nettoyés = 0;
        
        doublons.forEach(({ groupe }) => {
          const récent = groupe.filter(d => {
            const date = new Date(d.dateCreation || d.date || 0);
            const diffMinutes = (Date.now() - date.getTime()) / 60000;
            return diffMinutes <= seuilTempsMinutes;
          });
          
          if (récent.length >= 2) {
            if (fusionner) {
              get().fusionnerDoublons(groupe.map(d => d.id), groupe[0].id);
            } else {
              get().supprimerDoublons(groupe.map(d => d.id));
            }
            nettoyés++;
          }
        });
        
        if (notifier && nettoyés > 0) {
          import('./useNotificationsStore').then(({ useNotificationsStore }) => {
            useNotificationsStore.getState().ajouterNotification({
              type: 'INFO',
              icone: '🧹',
              titre: 'NETTOYAGE AUTO',
              message: `${nettoyés} groupe(s) de doublons nettoyé(s)`,
              lien: '/devis/liste'
            });
          }).catch((err) => {
            logger.error('Erreur import useNotificationsStore:', err.message);
          });
        }
        
        return { nettoyés, doublonsTrouvés: doublons.length };
      }
      // ═══════════════════════════════════════════════════
    }),
    { name: 'sika_devis', partialize: () => ({}) }
  )
);

export interface CompteurDevisStoreState {
  compteur: number;
  incrementer: () => void;
  getCompteur: () => number;
}

export const useCompteurDevisStore = create<CompteurDevisStoreState>()(
  persist(
    (set, get) => ({
      compteur: 990,
      incrementer: () => set((state) => ({ compteur: state.compteur + 1 })),
      getCompteur: () => {
        let { compteur } = get();
        if (compteur < 990) {
          compteur = 990;
          setTimeout(() => set({ compteur: 990 }), 0);
        }
        return compteur;
      }
    }),
    { name: 'sika_compteur_devis' }
  )
);
