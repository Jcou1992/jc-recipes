export type Language = 'en' | 'es';
export const LANGUAGE_COOKIE = 'preferred-language';
export const DEFAULT_LANGUAGE: Language = 'en';

export interface Translations {
  language: Language;
  languageToggleLabel: string;

  // Nav
  navSignOut: string;

  // Recipes page (server-rendered)
  recipesPageTitle: string;
  newRecipeBtn: string;
  noRecipesYet: string;
  noRecipesGetStarted: string;
  noRecipesCreateFirst: string;
  errorLoadingRecipes: string;

  // RecipeListClient
  searchPlaceholder: string;
  searchAriaLabel: string;
  clearSearchAriaLabel: string;
  selectBtn: string;
  doneSelectBtn: string;
  deselectAll: string;
  selectAll: (n: number) => string;
  nSelectedHint: (n: number) => string;
  tapToSelect: string;
  filterBtn: string;
  sortByLabel: string;
  filterByTagLabel: string;
  searchTagsPlaceholder: string;
  searchTagsAriaLabel: string;
  noTagsFound: string;
  doneFilterBtn: string;
  clearFilterBtn: string;
  nothingHere: string;
  tryDifferentTags: string;
  clearFiltersBtn: string;
  sortNewest: string;
  sortAz: string;
  sortFastest: string;
  sortMostIngredients: string;
  sortNewestHint: string;
  sortAzHint: string;
  sortFastestHint: string;
  sortMostIngredientsHint: string;
  shortcutFilter: string;

  // Inline filter rail
  moreTagsBtn: (n: number) => string;
  tagsZeroHint: string;
  resultCount: (n: number) => string;
  resultCountOf: (shown: number, total: number) => string;
  filteredBy: (tags: string[]) => string;

  // RecipeCard
  servingLabel: (n: number) => string;
  ingredientsCount: (n: number) => string;
  selectRecipeAriaLabel: (name: string) => string;
  deselectRecipeAriaLabel: (name: string) => string;

  // RecipeDetail server
  editBtn: string;

  // RecipeDetailClient
  decreaseServings: string;
  increaseServings: string;
  servingScalerLabel: (n: number) => string;
  resetServingsAriaLabel: string;
  resetBtn: string;
  prepLabel: string;
  cookLabel: string;
  totalLabel: string;
  metricLabel: string;
  imperialLabel: string;
  ingredientsSectionLabel: string;
  copyIngredientsBtn: string;
  ingredientsCopiedToast: string;
  copyFailedToast: string;
  cookBtn: string;
  preparationLabel: string;
  notesLabel: string;

  // RecipeForm
  nameLabel: string;
  namePlaceholder: string;
  nameRequired: string;
  servingsLabel: string;
  servingSizeLabel: string;
  servingSizeHelper: string;
  ingredientsFormLabel: string;
  addIngredientBtn: string;
  ingredientDefault: string;
  ingredientRemovedLabel: (name: string) => string;
  undoBtn: string;
  ingredientRequired: string;
  ingredientAmountPlaceholder: string;
  ingredientUnitPlaceholder: string;
  ingredientAmountAriaLabel: string;
  ingredientUnitAriaLabel: string;
  ingredientNameAriaLabel: string;
  removeIngredientAriaLabel: string;
  stepsLabel: string;
  addStepBtn: string;
  stepRemovedLabel: (n: number) => string;
  stepPlaceholder: (n: number) => string;
  stepAriaLabel: (n: number) => string;
  timerLabel: string;
  timerDurationPlaceholder: string;
  timerDurationAriaLabel: string;
  removeStepAriaLabel: string;
  optionalFields: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  prepTimeLabelForm: string;
  cookTimeLabelForm: string;
  tagsLabel: string;
  tagsPlaceholder: string;
  notesFormLabel: string;
  notesPlaceholder: string;
  savingBtn: string;
  cancelBtn: string;
  unsavedChangesIndicator: string;
  unsavedChangesWarning: string;

  // New recipe page
  backBtn: string;
  backToRecipes: string;
  newRecipeTitle: string;
  manualTab: string;
  importMarkdownTab: string;
  createRecipeSubmitLabel: string;
  recipeImportedToast: string;

  // Edit recipe page (server)
  editRecipeTitle: string;
  saveChangesSubmitLabel: string;

  // CookMode
  cookExitBtn: string;
  cookStepOf: (current: number, total: number) => string;
  cookTimerPillRunning: (step: number, time: string) => string;
  cookTimerPillDone: (step: number) => string;
  cookResetTimer: string;
  cookPauseTimer: string;
  cookStartTimer: string;
  cookPrevBtn: string;
  cookNextBtn: string;
  cookFinishBtn: string;
  cookIngredients: string;
  cookDoneBanner: string;
  cookInKitchen: (time: string) => string;
  cookBackToRecipe: string;
  cookPrintRecipe: string;
  cookStartAgain: string;

  // BulkActionBar
  bulkRecipeSelected: (n: number) => string;
  bulkDeleting: string;
  bulkDuplicate: string;
  bulkTags: string;
  bulkExportMd: string;
  bulkExportPdf: string;
  bulkDelete: string;
  bulkRetry: (n: number) => string;
  bulkDeleteTitle: (n: number) => string;
  bulkDeleteDescription: (n: number) => string;
  bulkConfirmDelete: string;
  bulkDeleted: (n: number) => string;
  bulkDeleteFailed: (reason: string) => string;
  bulkDeletePartial: (succeeded: number, total: number, failed: number) => string;
  bulkDuplicated: (n: number) => string;
  bulkDuplicateFailed: (reason: string) => string;
  bulkDuplicatePartial: (succeeded: number, total: number, failed: number) => string;
  bulkExported: (n: number) => string;

  // DeleteRecipeButton
  deleteRecipeTitle: string;
  deleteRecipeDescription: (name: string) => string;
  deleteConfirmBtn: string;
  deletingBtn: string;

  // BulkTagDialog
  bulkTagDialogTitle: (n: number) => string;
  bulkTagAddSection: string;
  bulkTagNewPlaceholder: string;
  bulkTagAddBtn: string;
  bulkTagRemoveSection: string;
  bulkTagCancel: string;
  bulkTagApply: string;
  bulkTagUpdating: string;
  bulkTagUpdated: (n: number) => string;
  bulkTagUpdatePartial: (succeeded: number, total: number) => string;

  // ConfirmDialog
  confirmCancelBtn: string;

  // Keyboard shortcuts
  shortcutHint: string;
  keyboardShortcutsTitle: string;
  shortcutSearch: string;
  shortcutNew: string;
  shortcutClear: string;
  shortcutHelp: string;
  shortcutClose: string;

  // Font-size toggle
  fontSizeLabel: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;

  // Editable space name
  spaceNameEditAriaLabel: string;
  spaceNameSaved: string;
  spaceNameSaveFailed: string;
  spaceNameCharLimit: string;

  // Recipe form preview pane
  recipePreviewLabel: string;
  recipePreviewEmpty: string;
  recipePreviewMoreIngredients: (n: number) => string;
  recipePreviewStepsCount: (n: number) => string;

  // Settings page
  settingsTitle: string;
  settingsWorkspaceSection: string;
  settingsAppearanceSection: string;
  settingsLanguageSection: string;
  settingsAccountSection: string;
  settingsSpaceNameLabel: string;
  settingsThemeLabel: string;
  settingsEmailLabel: string;
  settingsSaveBtn: string;
  settingsSignOut: string;
  settingsBackToRecipes: string;

  // Avatar menu
  avatarMenuAriaLabel: string;
  avatarMenuSignedInAs: string;
  avatarMenuSettings: string;
  avatarMenuTour: string;
  avatarMenuQuick: string;

  // Onboarding tour
  tourStep1Title: string;
  tourStep1Body: string;
  tourStep2Title: string;
  tourStep2Body: string;
  tourStep3Title: string;
  tourStep3Body: string;
  tourStep4Title: string;
  tourStep4Body: string;
  tourStep5Title: string;
  tourStep5Body: string;
  tourNext: string;
  tourBack: string;
  tourSkip: string;
  tourFinish: string;
  tourStepCounter: (current: number, total: number) => string;

  // Settings — Replay onboarding section
  settingsReplayOnboardingSection: string;
  settingsReplayOnboardingLabel: string;
  settingsReplayOnboardingDescription: string;
  settingsReplayOnboardingBtn: string;
  settingsReplayOnboardingConfirmTitle: string;
  settingsReplayOnboardingConfirmBody: string;
  settingsReplayOnboardingConfirmBtn: string;
  settingsReplayOnboardingCancelBtn: string;

  // Onboarding wizard (step 0 of the tour)
  onboardingWelcomeTitle: string;
  onboardingWelcomeBody: string;
  onboardingNextButton: string;
  onboardingErrorSave: string;
  onboardingThemeLabel: string;
  onboardingThemeDark: string;
  onboardingThemeLight: string;
  onboardingThemeAuto: string;
  onboardingLanguageLabel: string;
  onboardingSizeLabel: string;
  onboardingUnitsLabel: string;
  onboardingUnitsMetric: string;
  onboardingUnitsImperial: string;
  onboardingUnitsHelper: string;
}

export const en: Translations = {
  language: 'en',
  languageToggleLabel: 'ES',

  navSignOut: 'Sign out',

  recipesPageTitle: 'My Recipes',
  newRecipeBtn: '+ New recipe',
  noRecipesYet: 'No recipes yet',
  noRecipesGetStarted: 'Add your first recipe to get started.',
  noRecipesCreateFirst: 'Create your first recipe',
  errorLoadingRecipes: 'Error loading recipes:',

  searchPlaceholder: 'Search recipes…',
  searchAriaLabel: 'Search recipes',
  clearSearchAriaLabel: 'Clear search',
  selectBtn: 'Select',
  doneSelectBtn: 'Done',
  deselectAll: 'Deselect all',
  selectAll: (n) => `Select all (${n})`,
  nSelectedHint: (n) => `${n} selected`,
  tapToSelect: 'Tap to select',
  filterBtn: 'Filter',
  sortByLabel: 'Sort by',
  filterByTagLabel: 'Filter by tag',
  searchTagsPlaceholder: 'Search tags…',
  searchTagsAriaLabel: 'Search tags',
  noTagsFound: 'No tags found',
  doneFilterBtn: 'Done',
  clearFilterBtn: 'Clear',
  nothingHere: 'Nothing here',
  tryDifferentTags: 'Try different tags or clear your search.',
  clearFiltersBtn: 'Clear filters',
  sortNewest: 'Newest',
  sortAz: 'A → Z',
  sortFastest: 'Fastest',
  sortMostIngredients: 'Most ingredients',
  sortNewestHint: 'Most recent first',
  sortAzHint: 'Alphabetical by name',
  sortFastestHint: 'Shortest total time',
  sortMostIngredientsHint: 'Most complex first',
  shortcutFilter: 'F — Open filter',

  moreTagsBtn: (n) => `+${n} more`,
  tagsZeroHint: 'Tag recipes to filter here',
  resultCount: (n) => `${n} ${n === 1 ? 'recipe' : 'recipes'}`,
  resultCountOf: (shown, total) => `${shown} of ${total}`,
  filteredBy: (tags) => `filtered by ${tags.join(', ')}`,

  servingLabel: (n) => `${n} ${n !== 1 ? 'servings' : 'serving'}`,
  ingredientsCount: (n) => `${n} ingredients`,
  selectRecipeAriaLabel: (name) => `Select ${name}`,
  deselectRecipeAriaLabel: (name) => `Deselect ${name}`,

  editBtn: 'Edit',

  decreaseServings: 'Decrease servings',
  increaseServings: 'Increase servings',
  servingScalerLabel: (n) => `${n} ${n !== 1 ? 'servings' : 'serving'}`,
  resetServingsAriaLabel: 'Reset to original serving count',
  resetBtn: 'Reset',
  prepLabel: 'Prep:',
  cookLabel: 'Cook:',
  totalLabel: 'Total:',
  metricLabel: 'Metric',
  imperialLabel: 'Imperial',
  ingredientsSectionLabel: 'Ingredients',
  copyIngredientsBtn: 'Copy ingredients',
  ingredientsCopiedToast: 'Ingredients copied',
  copyFailedToast: 'Failed to copy to clipboard',
  cookBtn: 'Cook',
  preparationLabel: 'Preparation',
  notesLabel: 'Notes',

  nameLabel: 'Name',
  namePlaceholder: 'Recipe name',
  nameRequired: 'Recipe name is required.',
  servingsLabel: 'Servings',
  servingSizeLabel: 'Serving size label (optional)',
  servingSizeHelper: 'example: "1 burger", "250 g", "1 slice", "150 ml"',
  ingredientsFormLabel: 'Ingredients',
  addIngredientBtn: '+ Add',
  ingredientDefault: 'Ingredient',
  ingredientRemovedLabel: (name) => `${name} removed`,
  undoBtn: 'Undo',
  ingredientRequired: 'Add at least one ingredient.',
  ingredientAmountPlaceholder: 'Qty.',
  ingredientUnitPlaceholder: 'Unit',
  ingredientAmountAriaLabel: 'Ingredient amount',
  ingredientUnitAriaLabel: 'Ingredient unit',
  ingredientNameAriaLabel: 'Ingredient name',
  removeIngredientAriaLabel: 'Remove ingredient',
  stepsLabel: 'Steps',
  addStepBtn: '+ Step',
  stepRemovedLabel: (n) => `Step ${n} removed`,
  stepPlaceholder: (n) => `Step ${n}…`,
  stepAriaLabel: (n) => `Step ${n}`,
  timerLabel: 'Timer',
  timerDurationPlaceholder: 'e.g. 5 min, 1h 30min',
  timerDurationAriaLabel: 'Timer duration',
  removeStepAriaLabel: 'Remove step',
  optionalFields: 'Optional fields',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Short description for the list view',
  prepTimeLabelForm: 'Prep time (min)',
  cookTimeLabelForm: 'Cook time (min)',
  tagsLabel: 'Tags',
  tagsPlaceholder: 'tag1, tag2, tag3',
  notesFormLabel: 'Notes',
  notesPlaceholder: 'Variations, tips, shopping notes…',
  savingBtn: 'Saving…',
  cancelBtn: 'Cancel',
  unsavedChangesIndicator: '● Unsaved changes',
  unsavedChangesWarning: 'You have unsaved changes. Leave anyway?',

  backBtn: '← Back',
  backToRecipes: '← Recipes',
  newRecipeTitle: 'New recipe',
  manualTab: 'Manual',
  importMarkdownTab: 'Import from Markdown',
  createRecipeSubmitLabel: 'Create recipe',
  recipeImportedToast: 'Recipe imported from Markdown',

  editRecipeTitle: 'Edit recipe',
  saveChangesSubmitLabel: 'Save changes',

  cookExitBtn: '← Exit',
  cookStepOf: (current, total) => `Step ${current} of ${total}`,
  cookTimerPillRunning: (step, time) => `Step ${step} — ${time}`,
  cookTimerPillDone: (step) => `Step ${step} — Reset`,
  cookResetTimer: 'Reset',
  cookPauseTimer: 'Pause',
  cookStartTimer: 'Start',
  cookPrevBtn: '← Previous',
  cookNextBtn: 'Next →',
  cookFinishBtn: 'Finish ✓',
  cookIngredients: 'Ingredients',
  cookDoneBanner: 'Done.',
  cookInKitchen: (time) => `${time} in the kitchen`,
  cookBackToRecipe: 'Back to recipe',
  cookPrintRecipe: 'Print recipe',
  cookStartAgain: 'Start again',

  bulkRecipeSelected: (n) => `${n} ${n === 1 ? 'recipe selected' : 'recipes selected'}`,
  bulkDeleting: 'Deleting…',
  bulkDuplicate: 'Duplicate',
  bulkTags: 'Tags',
  bulkExportMd: 'Export MD',
  bulkExportPdf: 'Export PDF',
  bulkDelete: 'Delete',
  bulkRetry: (n) => `Retry (${n} failed)`,
  bulkDeleteTitle: (n) => n === 1 ? 'Delete recipe' : `Delete ${n} recipes`,
  bulkDeleteDescription: (n) =>
    n === 1
      ? 'Delete this recipe? This cannot be undone.'
      : `Delete these ${n} recipes? This cannot be undone.`,
  bulkConfirmDelete: 'Delete',
  bulkDeleted: (n) => `${n} deleted`,
  bulkDeleteFailed: (reason) => `Failed to delete — ${reason}`,
  bulkDeletePartial: (succeeded, total, failed) =>
    `Deleted ${succeeded} of ${total} — ${failed} failed. Use Retry below.`,
  bulkDuplicated: (n) => `${n} duplicated`,
  bulkDuplicateFailed: (reason) => `Failed to duplicate — ${reason}`,
  bulkDuplicatePartial: (succeeded, total, failed) =>
    `Duplicated ${succeeded} of ${total} — ${failed} failed`,
  bulkExported: (n) => `Exported ${n} recipe${n === 1 ? '' : 's'}`,

  deleteRecipeTitle: 'Delete recipe',
  deleteRecipeDescription: (name) => `Delete "${name}"? This cannot be undone.`,
  deleteConfirmBtn: 'Delete',
  deletingBtn: 'Deleting…',

  bulkTagDialogTitle: (n) =>
    `Edit tags on ${n} ${n === 1 ? 'recipe' : 'recipes'}`,
  bulkTagAddSection: 'Add tags',
  bulkTagNewPlaceholder: 'New tag…',
  bulkTagAddBtn: 'Add',
  bulkTagRemoveSection: 'Remove tags (shared across all selected)',
  bulkTagCancel: 'Cancel',
  bulkTagApply: 'Apply',
  bulkTagUpdating: 'Updating…',
  bulkTagUpdated: (n) => `Tags updated on ${n}`,
  bulkTagUpdatePartial: (succeeded, total) => `Updated ${succeeded} of ${total}`,

  confirmCancelBtn: 'Cancel',

  shortcutHint: 'Press / search · N new · F filter · Esc clear · ? help',
  keyboardShortcutsTitle: 'Keyboard shortcuts',
  shortcutSearch: '/ — Focus search',
  shortcutNew: 'N — New recipe',
  shortcutClear: 'Esc — Clear filters',
  shortcutHelp: '? — Show this help',
  shortcutClose: 'Close',

  fontSizeLabel: 'Font size',
  fontSizeSm: 'SM',
  fontSizeMd: 'MD',
  fontSizeLg: 'LG',

  spaceNameEditAriaLabel: 'Double-click to rename this space',
  spaceNameSaved: 'Space name saved',
  spaceNameSaveFailed: 'Could not save space name',
  spaceNameCharLimit: '30 characters max',

  recipePreviewLabel: 'Preview',
  recipePreviewEmpty: 'Preview appears here as you type.',
  recipePreviewMoreIngredients: (n) => `+${n} more`,
  recipePreviewStepsCount: (n) => `${n} ${n === 1 ? 'step' : 'steps'}`,

  settingsTitle: 'Settings',
  settingsWorkspaceSection: 'Workspace',
  settingsAppearanceSection: 'Appearance',
  settingsLanguageSection: 'Language',
  settingsAccountSection: 'Account',
  settingsSpaceNameLabel: 'Space name',
  settingsThemeLabel: 'Theme',
  settingsEmailLabel: 'Email',
  settingsSaveBtn: 'Save',
  settingsSignOut: 'Sign out',
  settingsBackToRecipes: '← Back to recipes',

  avatarMenuAriaLabel: 'Account menu',
  avatarMenuSignedInAs: 'Signed in as',
  avatarMenuSettings: 'Settings',
  avatarMenuTour: 'Take the tour',
  avatarMenuQuick: 'Quick toggles',

  tourStep1Title: 'Welcome to SEKAI',
  tourStep1Body: 'Your workspace lives here. Click the avatar for settings, theme, and language.',
  tourStep2Title: 'Find anything fast',
  tourStep2Body: 'Press / to jump here. Search by name or description.',
  tourStep3Title: 'Filter by tag and sort',
  tourStep3Body: 'Open this panel to narrow the list. Also reachable via F.',
  tourStep4Title: 'Create recipes',
  tourStep4Body: 'Press N or tap here to add a new recipe. You can also paste from Markdown.',
  tourStep5Title: 'Tap a recipe to cook',
  tourStep5Body: 'Scale servings, switch units, and enter cook mode for step-by-step guidance.',
  tourNext: 'Next',
  tourBack: 'Back',
  tourSkip: 'Skip',
  tourFinish: 'Finish',
  tourStepCounter: (current, total) => `Step ${current} of ${total}`,

  settingsReplayOnboardingSection: 'Preferences',
  settingsReplayOnboardingLabel: 'Replay onboarding',
  settingsReplayOnboardingDescription: 'Reset your preferences and walk through the setup wizard again.',
  settingsReplayOnboardingBtn: 'Replay onboarding',
  settingsReplayOnboardingConfirmTitle: 'Replay onboarding?',
  settingsReplayOnboardingConfirmBody:
    'This will reset your theme, language, text size, and units to defaults. Continue?',
  settingsReplayOnboardingConfirmBtn: 'Continue',
  settingsReplayOnboardingCancelBtn: 'Cancel',

  onboardingWelcomeTitle: 'Welcome, chef',
  onboardingWelcomeBody: 'Set your station before service.',
  onboardingNextButton: 'Next →',
  onboardingErrorSave: "Couldn't save — try again",
  onboardingThemeLabel: 'Theme',
  onboardingThemeDark: 'Dark',
  onboardingThemeLight: 'Light',
  onboardingThemeAuto: 'Auto',
  onboardingLanguageLabel: 'Language / 言語',
  onboardingSizeLabel: 'Text size',
  onboardingUnitsLabel: 'Units',
  onboardingUnitsMetric: 'Metric',
  onboardingUnitsImperial: 'Imperial',
  onboardingUnitsHelper: 'Applies to ingredient amounts.',
};

export const es: Translations = {
  language: 'es',
  languageToggleLabel: 'EN',

  navSignOut: 'Cerrar sesión',

  recipesPageTitle: 'Mis recetas',
  newRecipeBtn: '+ Nueva receta',
  noRecipesYet: 'Sin recetas todavía',
  noRecipesGetStarted: 'Agrega tu primera receta para comenzar.',
  noRecipesCreateFirst: 'Crear tu primera receta',
  errorLoadingRecipes: 'Error al cargar recetas:',

  searchPlaceholder: 'Buscar recetas…',
  searchAriaLabel: 'Buscar recetas',
  clearSearchAriaLabel: 'Limpiar búsqueda',
  selectBtn: 'Seleccionar',
  doneSelectBtn: 'Listo',
  deselectAll: 'Deseleccionar todo',
  selectAll: (n) => `Seleccionar todo (${n})`,
  nSelectedHint: (n) => `${n} seleccionados`,
  tapToSelect: 'Toca para seleccionar',
  filterBtn: 'Filtrar',
  sortByLabel: 'Ordenar por',
  filterByTagLabel: 'Filtrar por etiqueta',
  searchTagsPlaceholder: 'Buscar etiquetas…',
  searchTagsAriaLabel: 'Buscar etiquetas',
  noTagsFound: 'Sin etiquetas',
  doneFilterBtn: 'Listo',
  clearFilterBtn: 'Limpiar',
  nothingHere: 'Sin resultados',
  tryDifferentTags: 'Prueba con otras etiquetas o limpia tu búsqueda.',
  clearFiltersBtn: 'Limpiar filtros',
  sortNewest: 'Más reciente',
  sortAz: 'A → Z',
  sortFastest: 'Más rápido',
  sortMostIngredients: 'Más ingredientes',
  sortNewestHint: 'Más reciente primero',
  sortAzHint: 'Alfabético por nombre',
  sortFastestHint: 'Menor tiempo total',
  sortMostIngredientsHint: 'Más complejo primero',
  shortcutFilter: 'F — Abrir filtro',

  moreTagsBtn: (n) => `+${n} más`,
  tagsZeroHint: 'Etiqueta recetas para filtrar aquí',
  resultCount: (n) => `${n} ${n === 1 ? 'receta' : 'recetas'}`,
  resultCountOf: (shown, total) => `${shown} de ${total}`,
  filteredBy: (tags) => `filtrado por ${tags.join(', ')}`,

  servingLabel: (n) => `${n} ${n !== 1 ? 'porciones' : 'porción'}`,
  ingredientsCount: (n) => `${n} ingredientes`,
  selectRecipeAriaLabel: (name) => `Seleccionar ${name}`,
  deselectRecipeAriaLabel: (name) => `Deseleccionar ${name}`,

  editBtn: 'Editar',

  decreaseServings: 'Reducir porciones',
  increaseServings: 'Aumentar porciones',
  servingScalerLabel: (n) => `${n} ${n !== 1 ? 'porciones' : 'porción'}`,
  resetServingsAriaLabel: 'Restablecer porciones',
  resetBtn: 'Restablecer',
  prepLabel: 'Prep:',
  cookLabel: 'Cocción:',
  totalLabel: 'Total:',
  metricLabel: 'Métrico',
  imperialLabel: 'Imperial',
  ingredientsSectionLabel: 'Ingredientes',
  copyIngredientsBtn: 'Copiar ingredientes',
  ingredientsCopiedToast: 'Ingredientes copiados',
  copyFailedToast: 'Error al copiar',
  cookBtn: 'Cocinar',
  preparationLabel: 'Preparación',
  notesLabel: 'Notas',

  nameLabel: 'Nombre',
  namePlaceholder: 'Nombre de la receta',
  nameRequired: 'El nombre es requerido.',
  servingsLabel: 'Porciones',
  servingSizeLabel: 'Etiqueta del tamaño de porción (opcional)',
  servingSizeHelper: 'ejemplo: "1 hamburguesa", "250 g", "1 rebanada", "150 ml"',
  ingredientsFormLabel: 'Ingredientes',
  addIngredientBtn: '+ Agregar',
  ingredientDefault: 'Ingrediente',
  ingredientRemovedLabel: (name) => `${name} eliminado`,
  undoBtn: 'Deshacer',
  ingredientRequired: 'Agrega al menos un ingrediente.',
  ingredientAmountPlaceholder: 'Cant.',
  ingredientUnitPlaceholder: 'Unidad',
  ingredientAmountAriaLabel: 'Cantidad del ingrediente',
  ingredientUnitAriaLabel: 'Unidad del ingrediente',
  ingredientNameAriaLabel: 'Nombre del ingrediente',
  removeIngredientAriaLabel: 'Eliminar ingrediente',
  stepsLabel: 'Pasos',
  addStepBtn: '+ Paso',
  stepRemovedLabel: (n) => `Paso ${n} eliminado`,
  stepPlaceholder: (n) => `Paso ${n}…`,
  stepAriaLabel: (n) => `Paso ${n}`,
  timerLabel: 'Temporizador',
  timerDurationPlaceholder: 'ej. 5 min, 1h 30min',
  timerDurationAriaLabel: 'Duración del temporizador',
  removeStepAriaLabel: 'Eliminar paso',
  optionalFields: 'Campos opcionales',
  descriptionLabel: 'Descripción',
  descriptionPlaceholder: 'Descripción breve para la lista',
  prepTimeLabelForm: 'Tiempo de prep (min)',
  cookTimeLabelForm: 'Tiempo de cocción (min)',
  tagsLabel: 'Etiquetas',
  tagsPlaceholder: 'etiqueta1, etiqueta2',
  notesFormLabel: 'Notas',
  notesPlaceholder: 'Variaciones, consejos, notas de compra…',
  savingBtn: 'Guardando…',
  cancelBtn: 'Cancelar',
  unsavedChangesIndicator: '● Cambios sin guardar',
  unsavedChangesWarning: 'Tienes cambios sin guardar. ¿Salir de todas formas?',

  backBtn: '← Atrás',
  backToRecipes: '← Recetas',
  newRecipeTitle: 'Nueva receta',
  manualTab: 'Manual',
  importMarkdownTab: 'Importar desde Markdown',
  createRecipeSubmitLabel: 'Crear receta',
  recipeImportedToast: 'Receta importada desde Markdown',

  editRecipeTitle: 'Editar receta',
  saveChangesSubmitLabel: 'Guardar cambios',

  cookExitBtn: '← Salir',
  cookStepOf: (current, total) => `Paso ${current} de ${total}`,
  cookTimerPillRunning: (step, time) => `Paso ${step} — ${time}`,
  cookTimerPillDone: (step) => `Paso ${step} — Reiniciar`,
  cookResetTimer: 'Reiniciar',
  cookPauseTimer: 'Pausar',
  cookStartTimer: 'Iniciar',
  cookPrevBtn: '← Anterior',
  cookNextBtn: 'Siguiente →',
  cookFinishBtn: 'Finalizar ✓',
  cookIngredients: 'Ingredientes',
  cookDoneBanner: 'Listo.',
  cookInKitchen: (time) => `${time} en cocina`,
  cookBackToRecipe: 'Volver a la receta',
  cookPrintRecipe: 'Imprimir receta',
  cookStartAgain: 'Empezar de nuevo',

  bulkRecipeSelected: (n) => `${n} ${n === 1 ? 'receta seleccionada' : 'recetas seleccionadas'}`,
  bulkDeleting: 'Eliminando…',
  bulkDuplicate: 'Duplicar',
  bulkTags: 'Etiquetas',
  bulkExportMd: 'Exportar MD',
  bulkExportPdf: 'Exportar PDF',
  bulkDelete: 'Eliminar',
  bulkRetry: (n) => `Reintentar (${n} fallidos)`,
  bulkDeleteTitle: (n) => n === 1 ? 'Eliminar receta' : `Eliminar ${n} recetas`,
  bulkDeleteDescription: (n) =>
    n === 1
      ? '¿Eliminar esta receta? No se puede deshacer.'
      : `¿Eliminar estas ${n} recetas? No se puede deshacer.`,
  bulkConfirmDelete: 'Eliminar',
  bulkDeleted: (n) => `${n} eliminadas`,
  bulkDeleteFailed: (reason) => `Error al eliminar — ${reason}`,
  bulkDeletePartial: (succeeded, total, failed) =>
    `Eliminadas ${succeeded} de ${total} — ${failed} fallaron. Usa Reintentar.`,
  bulkDuplicated: (n) => `${n} duplicadas`,
  bulkDuplicateFailed: (reason) => `Error al duplicar — ${reason}`,
  bulkDuplicatePartial: (succeeded, total, failed) =>
    `Duplicadas ${succeeded} de ${total} — ${failed} fallaron`,
  bulkExported: (n) => `${n} receta${n === 1 ? '' : 's'} exportada${n === 1 ? '' : 's'}`,

  deleteRecipeTitle: 'Eliminar receta',
  deleteRecipeDescription: (name) => `¿Eliminar "${name}"? No se puede deshacer.`,
  deleteConfirmBtn: 'Eliminar',
  deletingBtn: 'Eliminando…',

  bulkTagDialogTitle: (n) =>
    `Editar etiquetas de ${n} ${n === 1 ? 'receta' : 'recetas'}`,
  bulkTagAddSection: 'Agregar etiquetas',
  bulkTagNewPlaceholder: 'Nueva etiqueta…',
  bulkTagAddBtn: 'Agregar',
  bulkTagRemoveSection: 'Eliminar etiquetas (compartidas)',
  bulkTagCancel: 'Cancelar',
  bulkTagApply: 'Aplicar',
  bulkTagUpdating: 'Actualizando…',
  bulkTagUpdated: (n) => `Etiquetas actualizadas en ${n}`,
  bulkTagUpdatePartial: (succeeded, total) => `Actualizadas ${succeeded} de ${total}`,

  confirmCancelBtn: 'Cancelar',

  shortcutHint: 'Pulsa / buscar · N nueva · F filtro · Esc limpiar · ? ayuda',
  keyboardShortcutsTitle: 'Atajos de teclado',
  shortcutSearch: '/ — Buscar',
  shortcutNew: 'N — Nueva receta',
  shortcutClear: 'Esc — Limpiar filtros',
  shortcutHelp: '? — Mostrar esta ayuda',
  shortcutClose: 'Cerrar',

  fontSizeLabel: 'Tamaño de texto',
  fontSizeSm: 'SM',
  fontSizeMd: 'MD',
  fontSizeLg: 'LG',

  spaceNameEditAriaLabel: 'Doble clic para renombrar este espacio',
  spaceNameSaved: 'Nombre del espacio guardado',
  spaceNameSaveFailed: 'No se pudo guardar',
  spaceNameCharLimit: '30 caracteres máximo',

  recipePreviewLabel: 'Vista previa',
  recipePreviewEmpty: 'La vista previa aparece aquí al escribir.',
  recipePreviewMoreIngredients: (n) => `+${n} más`,
  recipePreviewStepsCount: (n) => `${n} ${n === 1 ? 'paso' : 'pasos'}`,

  settingsTitle: 'Ajustes',
  settingsWorkspaceSection: 'Espacio',
  settingsAppearanceSection: 'Apariencia',
  settingsLanguageSection: 'Idioma',
  settingsAccountSection: 'Cuenta',
  settingsSpaceNameLabel: 'Nombre del espacio',
  settingsThemeLabel: 'Tema',
  settingsEmailLabel: 'Correo',
  settingsSaveBtn: 'Guardar',
  settingsSignOut: 'Cerrar sesión',
  settingsBackToRecipes: '← Volver a recetas',

  avatarMenuAriaLabel: 'Menú de cuenta',
  avatarMenuSignedInAs: 'Sesión iniciada como',
  avatarMenuSettings: 'Ajustes',
  avatarMenuTour: 'Hacer el tour',
  avatarMenuQuick: 'Ajustes rápidos',

  tourStep1Title: 'Bienvenido a SEKAI',
  tourStep1Body: 'Tu espacio vive aquí. Abre el avatar para ajustes, tema e idioma.',
  tourStep2Title: 'Encuentra rápido',
  tourStep2Body: 'Pulsa / para saltar aquí. Busca por nombre o descripción.',
  tourStep3Title: 'Filtra por etiqueta y ordena',
  tourStep3Body: 'Abre este panel para acotar la lista. También con F.',
  tourStep4Title: 'Crea recetas',
  tourStep4Body: 'Pulsa N o toca aquí para añadir una receta. También puedes pegar desde Markdown.',
  tourStep5Title: 'Toca una receta para cocinar',
  tourStep5Body: 'Escala raciones, cambia unidades y entra en modo cocina paso a paso.',
  tourNext: 'Siguiente',
  tourBack: 'Atrás',
  tourSkip: 'Omitir',
  tourFinish: 'Terminar',
  tourStepCounter: (current, total) => `Paso ${current} de ${total}`,

  settingsReplayOnboardingSection: 'Preferencias',
  settingsReplayOnboardingLabel: 'Reproducir bienvenida',
  settingsReplayOnboardingDescription: 'Restablece tus preferencias y repite el asistente de configuración.',
  settingsReplayOnboardingBtn: 'Reproducir bienvenida',
  settingsReplayOnboardingConfirmTitle: '¿Reproducir bienvenida?',
  settingsReplayOnboardingConfirmBody:
    'Esto restablecerá tu tema, idioma, tamaño de texto y unidades a los valores predeterminados. ¿Continuar?',
  settingsReplayOnboardingConfirmBtn: 'Continuar',
  settingsReplayOnboardingCancelBtn: 'Cancelar',

  onboardingWelcomeTitle: 'Bienvenido, chef',
  onboardingWelcomeBody: 'Prepara tu estación antes del servicio.',
  onboardingNextButton: 'Siguiente →',
  onboardingErrorSave: 'No se pudo guardar — reintentar',
  onboardingThemeLabel: 'Tema',
  onboardingThemeDark: 'Oscuro',
  onboardingThemeLight: 'Claro',
  onboardingThemeAuto: 'Automático',
  onboardingLanguageLabel: 'Idioma / 言語',
  onboardingSizeLabel: 'Tamaño de texto',
  onboardingUnitsLabel: 'Unidades',
  onboardingUnitsMetric: 'Métrico',
  onboardingUnitsImperial: 'Imperial',
  onboardingUnitsHelper: 'Aplica a cantidades de ingredientes.',
};

export const translations: Record<Language, Translations> = { en, es };

export function getT(lang: Language): Translations {
  return translations[lang];
}
