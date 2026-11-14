export const PROMOTIONS = {
  flyers: { name: 'Flyers', fee: 5, crowd: 1.25, pressure: 10, growth: 1, bonus: 10 },
  posters: { name: 'Posters', fee: 10, crowd: 1.5, pressure: 20, growth: 2, bonus: 20 },
  graffiti: { name: 'Graffiti', fee: 20, crowd: 2, pressure: 35, growth: 3, bonus: 35 },
  billboard: { name: 'Billboard', fee: 35, crowd: 3, pressure: 50, growth: 4, bonus: 60 },
} as const;
export type PromotionKey = keyof typeof PROMOTIONS;
