// Helper centralisé de notifications CRUD appelable depuis les stores.
// Émet un toast (succès/erreur/info) via le store de notifications,
// rendu globalement par <ToastContainer /> (Layout) — donc visible sur TOUTES les pages.

import { useNotificationsStore } from '../store/useNotificationsStore';

const getStore = () => {
  try {
    return useNotificationsStore.getState();
  } catch {
    return null;
  }
};

export const crudSuccess = (message, duration = 4000) => {
  const store = getStore();
  if (store?.toastSuccess) store.toastSuccess(message, duration);
};

export const crudError = (message, duration = 6000) => {
  const store = getStore();
  if (store?.toastError) store.toastError(message, duration);
};

export const crudInfo = (message, duration = 4000) => {
  const store = getStore();
  if (store?.toastInfo) store.toastInfo(message, duration);
};

export const crudWarning = (message, duration = 5000) => {
  const store = getStore();
  if (store?.toastWarning) store.toastWarning(message, duration);
};

// Messages génériques par opération pour garantir une cohérence partout.
export const crudMessages = {
  create: (entite) => `${entite} créé(e) avec succès`,
  update: (entite) => `${entite} modifié(e) avec succès`,
  delete: (entite) => `${entite} supprimé(e) avec succès`,
  createError: (entite, detail) => `Impossible de créer ${entite}${detail ? ' : ' + detail : ''}`,
  updateError: (entite, detail) => `Impossible de modifier ${entite}${detail ? ' : ' + detail : ''}`,
  deleteError: (entite, detail) => `Impossible de supprimer ${entite}${detail ? ' : ' + detail : ''}`,
};
