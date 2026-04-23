export interface SpotlightStep {
  kind: 'spotlight';
  id: string;
  targetSelector: string; // CSS selector — first match wins
  titleKey: string;
  bodyKey: string;
  page: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface WizardStep {
  kind: 'wizard';
  id: string;
  page: string;
}

export type TourStep = WizardStep | SpotlightStep;

// Step 0: preferences wizard. Steps 1-5: spotlight tour on /recipes.
// If a spotlight step's target doesn't exist, skip to next.
export const TOUR_STEPS: TourStep[] = [
  {
    kind: 'wizard',
    id: 'wizard',
    page: '/recipes',
  },
  {
    kind: 'spotlight',
    id: 'welcome',
    targetSelector: '[data-testid="avatar-menu-btn"]',
    titleKey: 'tourStep1Title',
    bodyKey: 'tourStep1Body',
    page: '/recipes',
    position: 'bottom',
  },
  {
    kind: 'spotlight',
    id: 'search',
    targetSelector: '[data-testid="recipe-search"]',
    titleKey: 'tourStep2Title',
    bodyKey: 'tourStep2Body',
    page: '/recipes',
    position: 'bottom',
  },
  {
    kind: 'spotlight',
    id: 'filter',
    targetSelector: '[data-testid="sort-pill-newest"]',
    titleKey: 'tourStep3Title',
    bodyKey: 'tourStep3Body',
    page: '/recipes',
    position: 'bottom',
  },
  {
    kind: 'spotlight',
    id: 'new',
    targetSelector: 'a[href="/recipes/new"]',
    titleKey: 'tourStep4Title',
    bodyKey: 'tourStep4Body',
    page: '/recipes',
    position: 'bottom',
  },
  {
    kind: 'spotlight',
    id: 'card',
    targetSelector: '[data-testid^="recipe-card-"]',
    titleKey: 'tourStep5Title',
    bodyKey: 'tourStep5Body',
    page: '/recipes',
    position: 'top',
  },
];
