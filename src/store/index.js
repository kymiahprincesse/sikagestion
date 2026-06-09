/**
 * Index centralisé des stores avec lazy loading
 * Les stores volumineux ne sont chargés qu'à la première utilisation
 */

import { useClientsStore } from './useClientsStore';
import { useAuthStore } from './useAuthStore';
import { useFacturesStore } from './useFacturesStore';
import { useDevisStore } from './useDevisStore';
import { useAOStore } from './useAOStore';
import { useFournisseursStore } from './useFournisseursStore';
import { useCaisseStore } from './useCaisseStore';
import { useEncaissementsStore } from './useEncaissementsStore';
import { useJournalStore } from './useJournalStore';
import { useNotificationsStore } from './useNotificationsStore';
import { useParametresStore } from './useParametresStore';
import { useAuditStore } from './useAuditStore';
import { useConditionsPaiementStore } from './useConditionsPaiementStore';

// ── STORES LÉGERS (chargés immédiatement) ─────────────────
export {
  useAuthStore,
  useClientsStore,
  useFacturesStore,
  useDevisStore,
  useAOStore,
  useFournisseursStore,
  useCaisseStore,
  useEncaissementsStore,
  useJournalStore,
  useNotificationsStore,
  useParametresStore,
  useAuditStore,
  useConditionsPaiementStore,
};

// Ré-export des stores volumineux
// Note: Pour optimiser le bundle, envisager le lazy loading au niveau des routes:
// const PlanificationProjet = lazy(() => import('./modules/planification/PlanificationProjet'))
export { usePlanificationStore } from './usePlanificationStore';
export { useUtilisateursStore } from './useUtilisateursStore';
