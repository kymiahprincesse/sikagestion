import { SUPER_ADMIN_ID, SUPER_ADMIN_EMAIL, SUPER_ADMIN_LOGIN } from '../config/auditConfig';

const normalizeRoleValue = (role) => {
  if (!role || typeof role !== 'string') return '';
  const normalized = role.trim().toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'SUPERADMIN') return 'SUPER_ADMIN';
  return normalized;
};

export const normalizeRole = (role) => normalizeRoleValue(role);

export const isSuperAdmin = (user) => {
  if (!user) return false;

  const login = (user.login || '').trim().toLowerCase();
  const email = (user.email || '').trim().toLowerCase();
  const role = normalizeRoleValue(user.role);

  return (
    user.id === SUPER_ADMIN_ID ||
    role === 'SUPER_ADMIN' ||
    login === SUPER_ADMIN_LOGIN.toLowerCase() ||
    email === SUPER_ADMIN_EMAIL.toLowerCase()
  );
};

export const filtrerSuperAdmin = (liste) => {
  if (!Array.isArray(liste)) return liste;

  return liste.filter((u) => !isSuperAdmin(u));
};
