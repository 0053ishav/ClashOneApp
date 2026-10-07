import { create } from "zustand";

type PremiumState = {
  isPremium: boolean;

  setPremium: (value: boolean) => void;

  reset: () => void;
};

export const usePremiumStore = create<PremiumState>((set) => ({
  isPremium: false,

  setPremium: (value) =>
    set({
      isPremium: value,
    }),

  reset: () =>
    set({
      isPremium: false,
    }),
}));