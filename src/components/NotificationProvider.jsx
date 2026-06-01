import React, { createContext, useContext } from 'react';
import { useNotification } from '../hooks/useNotification';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import NotificationToast from './NotificationToast';
import ConfirmDialog from './ConfirmDialog';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const notification = useNotification();
  const confirmDialog = useConfirmDialog();

  const value = {
    success: notification.success,
    error: notification.error,
    warning: notification.warning,
    info: notification.info,
    confirm: confirmDialog.confirm,
    confirmDelete: confirmDialog.confirmDelete,
    confirmExit: confirmDialog.confirmExit
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToast 
        notifications={notification.notifications}
        onClose={notification.removeNotification}
      />
      <ConfirmDialog {...confirmDialog.dialogState} />
    </NotificationContext.Provider>
  );
};
