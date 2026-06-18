import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { formatFCFA, getTodayISO, generateSecureId } from '../utils/format';
import { quickCheck, findAllDuplicates, mergeDuplicates } from '../utils/duplicateDetector';
import { logger } from '../utils/logger';
import { crudSuccess, crudError } from '../utils/crudNotify';

function toSupabaseRow(devis) {
  return {
    numero: devis.numero,
    client_id: devis.clientId || null,
    client_nom: devis.clientNom || null,
    type_devis: devis.typeDevis || null,
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

export const useDevisStore = create(
  persist(
    (set, get) => ({
      devis: [],
      compteurGlobal: 930,

      getNextNumero: () => {
        const { compteurGlobal } = get();
        const annee = new Date().getFullYear();
        const numero = `N°${compteurGlobal}/SIKA/${annee}`;
        // Ne pas incrémenter ici - causerait setState pendant render
        // L'incrémentation se fait dans addDevis quand le numéro est réellement utilisé
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
          get().incrementCompteur();
        }
        devis.numero = numero;

        // ═══ NOUVEAU SYSTÈME DE DÉTECTION DE DOUBLONS ═══
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
        // ═══════════════════════════════════════════════

        const nouveauDevis = {
          ...devis,
          id: devis.id || generateSecureId('DEV'),
          numero: devis.numero || numero,
          dateCreation: devis.dateCreation || getTodayISO(),
          statut: devis.statut || 'BROUILLON',
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
              quantite: parseFloat(l.qte) || parseFloat(l.quantite) || 0,
              ml: parseFloat(l.ml) || 0,
              pt: parseFloat(l.pt) || 0,
              unite: l.unite || l.dn || null,
              pu: parseFloat(l.pu) || 0,
              montant: parseFloat(l.montant) || 0,
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
        set((state) => ({
          devis: state.devis.map((d) => d.id === id ? { ...d, ...modifications } : d)
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

        const { error } = await supabase.from('devis').update(toSupabaseRow({ ...devisMaj, ...modifications })).eq('id', id);
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
                quantite: parseFloat(l.qte) || parseFloat(l.quantite) || 0,
                ml: parseFloat(l.ml) || 0,
                pt: parseFloat(l.pt) || 0,
                unite: l.unite || l.dn || null,
                pu: parseFloat(l.pu) || 0,
                montant: parseFloat(l.montant) || 0,
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

      deleteDevis: (id) => {
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

        supabase.from('devis').delete().eq('id', id).then(({ error }) => {
          if (error) {
            logger.error('Supabase deleteDevis:', error.message);
            crudError(`Impossible de supprimer le devis : ${error.message}`);
          } else {
            crudSuccess(`Devis ${devisSupprime?.numero || ''} supprimé avec succès`);
          }
        }).catch((err) => {
          logger.error('Erreur deleteDevis:', err.message);
          crudError(`Impossible de supprimer le devis : ${err.message}`);
        });
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

      setDevis: (devis) => { set({ devis }); },

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

export const useCompteurDevisStore = create(
  persist(
    (set, get) => ({
      compteur: 930,
      incrementer: () => set((state) => ({ compteur: state.compteur + 1 })),
      getCompteur: () => get().compteur
    }),
    { name: 'sika_compteur_devis' }
  )
);
