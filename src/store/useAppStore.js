import { create } from 'zustand'

export const useAppStore = create((set) => ({
  user: null, // Pas d'utilisateur par défaut - doit être chargé depuis Supabase Auth
  
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  notifications: [],
  addNotification: (notification) => 
    set((state) => ({ 
      notifications: [...state.notifications, { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, ...notification }] 
    })),
  removeNotification: (id) => 
    set((state) => ({ 
      notifications: state.notifications.filter(n => n.id !== id) 
    })),
}))
