export interface TourStep {
  id: string;
  targetSelector: string; // CSS selector — first match wins
  titleKey: string;
  bodyKey: string;
  page: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

// 5 steps, /recipes only. If a step's target doesn't exist, skip to next.
// Cross-page cook-mode step dropped for MVP to avoid navigation complexity.
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: '[data-testid="avatar-menu-btn"]',
    titleKey: 'tourStep1Title',
    bodyKey: 'tourStep1Body',
    page: '/recipes',
    position: 'bottom',
  },
  {
    id: 'search',
    targetSelector: '[data-testid="recipe-search"]',
    titleKey: 'tourStep2Title',
    bodyKey: 'tourStep2Body',
    page: '/recipes',
    position: 'bottom',
  },
  {
    id: 'filter',
    targetSelector: '[data-testid="filter-desktop-btn"], [data-testid="filter-mobile-btn"]',
    titleKey: 'tourStep3Title',
    bodyKey: 'tourStep3Body',
    page: '/recipes',
    position: 'bottom',
  },
  {
    id: 'new',
    targetSelector: 'a[href="/recipes/new"]',
    titleKey: 'tourStep4Title',
    bodyKey: 'tourStep4Body',
    page: '/recipes',
    position: 'bottom',
  },
  {
    id: 'card',
    targetSelector: '[data-testid^="recipe-card-"]',
    titleKey: 'tourStep5Title',
    bodyKey: 'tourStep5Body',
    page: '/recipes',
    position: 'top',
  },
];
