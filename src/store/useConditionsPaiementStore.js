import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';

const CONDITIONS_DEFAUT = [
  { value: 7, label: '7 jours' },
  { value: 15, label: '15 jours' },
  { value: 30, label: '30 jours' },
  { value: 45, label: '45 jours' },
  { value: 60, label: '60 jours' },
  { value: 90, label: '90 jours' }
];

export const useConditionsPaiementStore = create(
  persist(
    (set, get) => ({
      conditions: CONDITIONS_DEFAUT,

      addCondition: (jours) => {
        const { conditions } = get();
        const existe = conditions.find(c => c.value === jours);
        
        if (!existe && jours > 0) {
          const nouvelleCondition = {
            value: jours,
            label: `${jours} jours`
          };
          
          set({
            conditions: [...conditions, nouvelleCondition].sort((a, b) => a.value - b.value)
          });
          
          return nouvelleCondition;
        }
        
        return existe;
      },

      removeCondition: (jours) => {
        set((state) => ({
          conditions: state.conditions.filter(c => c.value !== jours)
        }));
      },

      updateCondition: (ancienneValeur, nouvelleValeur) => {
        if (nouvelleValeur <= 0) return false;
        
        const { conditions } = get();
        const existe = conditions.find(c => c.value === nouvelleValeur && c.value !== ancienneValeur);
        
        if (existe) return false;
        
        set((state) => ({
          conditions: state.conditions
            .map(c => c.value === ancienneValeur 
              ? { value: nouvelleValeur, label: `${nouvelleValeur} jours` }
              : c
            )
            .sort((a, b) => a.value - b.value)
        }));
        
        return true;
      },

      resetConditions: () => {
        set({ conditions: CONDITIONS_DEFAUT });
      }
    }),
    {
      name: 'sika_conditions_paiement',
      storage: createJSONStorage(() => idbStorage)
    }
  )
);
