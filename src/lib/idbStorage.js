import { get, set, del } from 'idb-keyval';

/**
 * Custom storage adapter for Zustand persist middleware using IndexedDB via idb-keyval.
 * This circumvents the 5MB localStorage limit, allowing massive amounts of data
 * to be stored offline seamlessly.
 */
export const idbStorage = {
  getItem: async (name) => {
    return (await get(name)) || null;
  },
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};
