import { create } from 'zustand';

type Tab = 'Today' | 'Learn' | 'Practice' | 'Progress';

interface AppState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  
  // Learning Session State
  sessionQueue: string[]; // item_ids
  currentIndex: number;
  setSessionQueue: (items: string[]) => void;
  nextItem: () => void;
  endSession: () => void;
  
  // App initialization state
  isSeeding: boolean;
  setIsSeeding: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'Today',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  sessionQueue: [],
  currentIndex: 0,
  setSessionQueue: (items) => set({ sessionQueue: items, currentIndex: 0, activeTab: 'Learn' }),
  nextItem: () => set((state) => {
    if (state.currentIndex >= state.sessionQueue.length - 1) {
      return { activeTab: 'Progress', sessionQueue: [], currentIndex: 0 }; // Go to progress when done
    }
    return { currentIndex: state.currentIndex + 1 };
  }),
  endSession: () => set({ sessionQueue: [], currentIndex: 0, activeTab: 'Today' }),
  
  isSeeding: true,
  setIsSeeding: (val) => set({ isSeeding: val })
}));
