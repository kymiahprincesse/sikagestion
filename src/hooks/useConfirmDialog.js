import { useState, useCallback } from 'react';

export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    onConfirm: null,
    onCancel: null
  });

  const confirm = useCallback(({
    title = 'Confirmation',
    message = 'Êtes-vous sûr de vouloir continuer ?',
    type = 'warning',
    confirmText = 'Confirmer',
    cancelText = 'Annuler'
  }) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  const confirmDelete = useCallback((itemName = 'cet élément') => {
    return confirm({
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer ${itemName} ? Cette action est irréversible.`,
      type: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
  }, [confirm]);

  const confirmExit = useCallback((hasUnsavedChanges = false) => {
    if (!hasUnsavedChanges) return Promise.resolve(true);
    
    return confirm({
      title: 'Modifications non enregistrées',
      message: 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?',
      type: 'warning',
      confirmText: 'Quitter',
      cancelText: 'Rester'
    });
  }, [confirm]);

  return {
    dialogState,
    confirm,
    confirmDelete,
    confirmExit
  };
};
