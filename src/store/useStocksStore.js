import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { idbStorage } from '../lib/idbStorage';

export const useStocksStore = create((set, get) => ({
  stocks: [],
  loading: false,
  error: null,
  
  fetchStocks: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.from('stocks').select('*').order('nom', { ascending: true });
      if (error) throw error;
      set({ stocks: data || [], loading: false });
    } catch (e) {
      console.warn('Fallback local stocks:', e.message);
      const localData = await idbStorage.getStocks();
      set({ stocks: localData || [], loading: false });
    }
  },

  ajouterStock: async (item) => {
    try {
      const { data, error } = await supabase.from('stocks').insert([item]).select().single();
      if (error) throw error;
      set(state => ({ stocks: [...state.stocks, data] }));
    } catch (e) {
      // Local fallback
      const newItem = { ...item, id: Date.now().toString() };
      const current = get().stocks;
      const updated = [...current, newItem];
      await idbStorage.saveStocks(updated);
      set({ stocks: updated });
    }
  },
  
  modifierStock: async (id, changes) => {
    try {
      const { data, error } = await supabase.from('stocks').update(changes).eq('id', id).select().single();
      if (error) throw error;
      set(state => ({ stocks: state.stocks.map(s => s.id === id ? data : s) }));
    } catch (e) {
      const current = get().stocks;
      const updated = current.map(s => s.id === id ? { ...s, ...changes } : s);
      await idbStorage.saveStocks(updated);
      set({ stocks: updated });
    }
  },

  supprimerStock: async (id) => {
    try {
      await supabase.from('stocks').delete().eq('id', id);
      set(state => ({ stocks: state.stocks.filter(s => s.id !== id) }));
    } catch (e) {
      const current = get().stocks;
      const updated = current.filter(s => s.id !== id);
      await idbStorage.saveStocks(updated);
      set({ stocks: updated });
    }
  }
}));
