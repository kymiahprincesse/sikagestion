import { SUPER_ADMIN_ID, SUPER_ADMIN_EMAIL, SUPER_ADMIN_LOGIN } from '../config/auditConfig';

export const filtrerSuperAdmin = (liste) => {
  if (!Array.isArray(liste)) return liste;
  
  return liste.filter(u =>
    u.id !== SUPER_ADMIN_ID &&
    u.login !== SUPER_ADMIN_LOGIN &&
    u.email !== SUPER_ADMIN_EMAIL &&
    u.login !== 'munokolive' &&
    u.email !== 'munokolive@gmail.com'
  );
};

export const isSuperAdmin = (user) => {
  if (!user) return false;
  return (
    user.id === SUPER_ADMIN_ID ||
    user.login === SUPER_ADMIN_LOGIN ||
    user.email === SUPER_ADMIN_EMAIL ||
    user.login === 'munokolive' ||
    user.email === 'munokolive@gmail.com'
  );
};
