<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { FormInput, FormTextarea, FormCheckbox, Button, Select, SelectWithSuggest, MultiSelect, Sheet } from '$lib/components';
  import { Loader2 } from 'lucide-svelte';
  import FileUploadField from './FileUploadField.svelte';

  interface Option {
    value: string;
    label: string;
    characterType?: 'official' | 'fan'; // For characters only
  }

  interface SpriteUploadFormProps {
    teams?: Option[];
    officialGames?: Option[];
    fanGames?: Option[];
    series?: Option[];
    sections?: Option[];
    contributors?: Option[];
    characters?: Option[];
    sprite?: any;
    isEditMode?: boolean;
  }

  let {
    teams = [],
    officialGames = [],
    fanGames = [],
    series = [],
    sections = [],
    contributors = [],
    characters = [],
    sprite = null,
    isEditMode = false
  }: SpriteUploadFormProps = $props();

  // Form state
  let title = $state('');
  let description = $state('');
  let spriteImage = $state<File | null>(null);
  let iconImage = $state<File | null>(null);
  let styleSourceType = $state('');
  let styleTeam = $state('');
  let styleOfficialGame = $state('');
  let styleFanGame = $state('');
  let styleSeries = $state('');
  let section = $state('');
  let selectedCharacters = $state<string[]>([]);
  let selectedContributors = $state<string[]>([]);

  // Terms of Use
  let contactForPermissions = $state(false);
  let informWhenUsed = $state(false);
  let creditWhereUsed = $state(false);

  // UI state
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});
  let formRef: HTMLFormElement;

  // Sheet states
  let teamSheetOpen = $state(false);
  let officialGameSheetOpen = $state(false);
  let fanGameSheetOpen = $state(false);
  let seriesSheetOpen = $state(false);
  let sectionSheetOpen = $state(false);
  let characterSheetOpen = $state(false);
  let contributorSheetOpen = $state(false);

  // Sheet form states
  let teamForm = $state({ name: '' });
  let officialGameForm = $state({ name: '', year: '' });
  let fanGameForm = $state({ name: '', year: '' });
  let seriesForm = $state({ name: '', year: '' });
  let sectionForm = $state({ name: '' });
  let characterForm = $state({ name: '' });
  let contributorForm = $state({ name: '' });

  // Sheet form errors
  let teamFormErrors = $state<Record<string, string>>({});
  let officialGameFormErrors = $state<Record<string, string>>({});
  let fanGameFormErrors = $state<Record<string, string>>({});
  let seriesFormErrors = $state<Record<string, string>>({});
  let sectionFormErrors = $state<Record<string, string>>({});
  let characterFormErrors = $state<Record<string, string>>({});
  let contributorFormErrors = $state<Record<string, string>>({});

  // Sheet form submission states
  let teamSubmitting = $state(false);
  let officialGameSubmitting = $state(false);
  let fanGameSubmitting = $state(false);
  let seriesSubmitting = $state(false);
  let sectionSubmitting = $state(false);
  let characterSubmitting = $state(false);
  let contributorSubmitting = $state(false);

  // Error field labels for display
  const fieldLabels: Record<string, string> = {
    title: 'Sheet Title',
    description: 'Description',
    spriteImage: 'Sprite Sheet Image',
    iconImage: 'Icon Image',
    styleSourceType: 'Style Source Type',
    styleTeam: 'Project Team',
    styleOfficialGame: 'Official Game',
    styleFanGame: 'Fan Game',
    styleSeries: 'Series',
    section: 'Section'
  };

  // Get array of error messages for display
  const errorMessages = $derived(
    Object.entries(errors).map(([key, message]) => ({
      field: fieldLabels[key] || key,
      message
    }))
  );

  // Derived state
  const showStyleTeam = $derived(styleSourceType === 'team');
  const showStyleOfficialGame = $derived(styleSourceType === 'officialGame');
  const showStyleFanGame = $derived(styleSourceType === 'fanGame');
  const showStyleSeries = $derived(styleSourceType === 'series');

  // Show characters for section ID 1 (Official Characters) or 13 (Fan Characters)
  const showCharacters = $derived(section === '1' || section === '13');

  // Filter characters based on section type
  const filteredCharacters = $derived(
    section === '1'
      ? characters.filter(c => c.characterType === 'official') // Official Characters section
      : section === '13'
      ? characters.filter(c => c.characterType === 'fan')      // Fan Characters section
      : characters                                             // Default: show all
  );

  // Style Source Type options
  const styleSourceTypeOptions: Option[] = [
    { value: 'team', label: 'Project Team' },
    { value: 'fanGame', label: 'Fan Game' },
    { value: 'officialGame', label: 'Official Game' },
    { value: 'series', label: 'Series' },
    { value: 'custom', label: 'Custom' }
  ];

  // Sheet open handlers
  function openTeamSheet() { teamSheetOpen = true; }
  function openOfficialGameSheet() { officialGameSheetOpen = true; }
  function openFanGameSheet() { fanGameSheetOpen = true; }
  function openSeriesSheet() { seriesSheetOpen = true; }
  function openSectionSheet() { sectionSheetOpen = true; }
  function openCharacterSheet() { characterSheetOpen = true; }
  function openContributorSheet() { contributorSheetOpen = true; }

  // Sheet close handlers (reset forms)
  function closeTeamSheet() {
    teamForm = { name: '' };
    teamFormErrors = {};
  }
  function closeOfficialGameSheet() {
    officialGameForm = { name: '', year: '' };
    officialGameFormErrors = {};
  }
  function closeFanGameSheet() {
    fanGameForm = { name: '', year: '' };
    fanGameFormErrors = {};
  }
  function closeSeriesSheet() {
    seriesForm = { name: '', year: '' };
    seriesFormErrors = {};
  }
  function closeSectionSheet() {
    sectionForm = { name: '' };
    sectionFormErrors = {};
  }
  function closeCharacterSheet() {
    characterForm = { name: '' };
    characterFormErrors = {};
  }
  function closeContributorSheet() {
    contributorForm = { name: '' };
    contributorFormErrors = {};
  }

  // Sheet submit handlers
  async function submitTeamSuggestion() {
    const errs: Record<string, string> = {};
    if (!teamForm.name.trim()) errs.name = 'Team name is required';
    teamFormErrors = errs;
    if (Object.keys(errs).length > 0) return;

    teamSubmitting = true;
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: teamForm.name.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create team');
      }

      const result = await response.json();
      const newTeamId = result.doc.id.toString();
      const newTeamName = result.doc.name;

      // Add to the teams dropdown options
      teams = [...teams, { value: newTeamId, label: newTeamName }];

      // Auto-select the newly created team
      styleTeam = newTeamId;

      toast.success(`Team "${newTeamName}" created and selected!`);
      teamSheetOpen = false;
      closeTeamSheet();
    } catch (error) {
      console.error('[Upload Form] Failed to create team:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create team');
      teamFormErrors = { name: 'Failed to create team. Please try again.' };
    } finally {
      teamSubmitting = false;
    }
  }

  async function submitOfficialGameSuggestion() {
    const errs: Record<string, string> = {};
    if (!officialGameForm.name.trim()) errs.name = 'Game name is required';
    if (!officialGameForm.year.trim()) {
      errs.year = 'Release year is required';
    } else {
      const y = parseInt(officialGameForm.year);
      if (isNaN(y) || y < 1900 || y > new Date().getFullYear() + 5) {
        errs.year = 'Please enter a valid year';
      }
    }
    officialGameFormErrors = errs;
    if (Object.keys(errs).length > 0) return;

    officialGameSubmitting = true;
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: officialGameForm.name.trim(),
          gameType: 'official',
          year: officialGameForm.year.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create official game');
      }

      const result = await response.json();
      const newGameId = result.doc.id.toString();
      const newGameName = result.doc.name || result.doc.title;

      // Add to the official games dropdown options
      officialGames = [...officialGames, { value: newGameId, label: newGameName }];

      // Auto-select the newly created game
      styleOfficialGame = newGameId;

      toast.success(`Official game "${newGameName}" created and selected!`);
      officialGameSheetOpen = false;
      closeOfficialGameSheet();
    } catch (error) {
      console.error('[Upload Form] Failed to create official game:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create official game');
      officialGameFormErrors = { name: 'Failed to create game. Please try again.' };
    } finally {
      officialGameSubmitting = false;
    }
  }

  async function submitFanGameSuggestion() {
    const errs: Record<string, string> = {};
    if (!fanGameForm.name.trim()) errs.name = 'Game name is required';
    if (!fanGameForm.year.trim()) {
      errs.year = 'Release year is required';
    } else {
      const y = parseInt(fanGameForm.year);
      if (isNaN(y) || y < 1900 || y > new Date().getFullYear() + 5) {
        errs.year = 'Please enter a valid year';
      }
    }
    fanGameFormErrors = errs;
    if (Object.keys(errs).length > 0) return;

    fanGameSubmitting = true;
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: fanGameForm.name.trim(),
          gameType: 'fan',
          year: fanGameForm.year.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Upload Form] Fan game creation error response:', errorData);
        throw new Error(errorData.message || 'Failed to create fan game');
      }

      const result = await response.json();
      const newGameId = result.doc.id.toString();
      const newGameName = result.doc.name || result.doc.title;

      // Add to the fan games dropdown options
      fanGames = [...fanGames, { value: newGameId, label: newGameName }];

      // Auto-select the newly created game
      styleFanGame = newGameId;

      toast.success(`Fan game "${newGameName}" created and selected!`);
      fanGameSheetOpen = false;
      closeFanGameSheet();
    } catch (error) {
      console.error('[Upload Form] Failed to create fan game:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create fan game';
      toast.error(errorMessage, { duration: 5000 });
      fanGameFormErrors = { name: errorMessage };
    } finally {
      fanGameSubmitting = false;
    }
  }

  async function submitSeriesSuggestion() {
    const errs: Record<string, string> = {};
    if (!seriesForm.name.trim()) errs.name = 'Series name is required';
    if (!seriesForm.year.trim()) {
      errs.year = 'Release year is required';
    } else {
      const y = parseInt(seriesForm.year);
      if (isNaN(y) || y < 1900 || y > new Date().getFullYear() + 5) {
        errs.year = 'Please enter a valid year';
      }
    }
    seriesFormErrors = errs;
    if (Object.keys(errs).length > 0) return;

    seriesSubmitting = true;
    try {
      const response = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: seriesForm.name.trim(),
          year: seriesForm.year.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create series');
      }

      const result = await response.json();
      const newSeriesId = result.doc.id.toString();
      const newSeriesName = result.doc.name || result.doc.title;

      // Add to the series dropdown options
      series = [...series, { value: newSeriesId, label: newSeriesName }];

      // Auto-select the newly created series
      styleSeries = newSeriesId;

      toast.success(`Series "${newSeriesName}" created and selected!`);
      seriesSheetOpen = false;
      closeSeriesSheet();
    } catch (error) {
      console.error('[Upload Form] Failed to create series:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create series');
      seriesFormErrors = { name: 'Failed to create series. Please try again.' };
    } finally {
      seriesSubmitting = false;
    }
  }

  async function submitSectionSuggestion() {
    const errs: Record<string, string> = {};
    if (!sectionForm.name.trim()) errs.name = 'Section name is required';
    sectionFormErrors = errs;
    if (Object.keys(errs).length > 0) return;

    sectionSubmitting = true;
    try {
      const response = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: sectionForm.name.trim() })
      });

      console.log('[Upload Form] Section creation response status:', response.status);

      if (!response.ok) {
        // Try to parse as JSON, but fall back to text if it fails
        let errorMessage = 'Failed to create section';
        try {
          const errorData = await response.json();
          console.error('[Upload Form] Section creation error response:', errorData);
          errorMessage = errorData.message || errorMessage;
          // Log detailed errors if available
          if (errorData.errors && Array.isArray(errorData.errors)) {
            console.error('[Upload Form] Validation errors:', errorData.errors);
            errorMessage += ': ' + errorData.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ');
          }
        } catch (e) {
          const errorText = await response.text();
          console.error('[Upload Form] Non-JSON error response:', errorText);
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const newSectionId = result.doc.id.toString();
      const newSectionName = result.doc.name || result.doc.title;

      // Add to the sections dropdown options
      sections = [...sections, { value: newSectionId, label: newSectionName }];

      // Auto-select the newly created section
      section = newSectionId;

      toast.success(`Section "${newSectionName}" created and selected!`);
      sectionSheetOpen = false;
      closeSectionSheet();
    } catch (error) {
      console.error('[Upload Form] Failed to create section:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create section';
      toast.error(errorMessage, { duration: 5000 });
      sectionFormErrors = { name: errorMessage };
    } finally {
      sectionSubmitting = false;
    }
  }

  async function submitCharacterSuggestion() {
    const errs: Record<string, string> = {};
    if (!characterForm.name.trim()) errs.name = 'Character name is required';
    characterFormErrors = errs;
    if (Object.keys(errs).length > 0) return;

    characterSubmitting = true;
    try {
      // Determine character type based on current section
      const characterType = section === '13' ? 'fan' : 'official';

      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: characterForm.name.trim(),
          characterType: characterType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create character');
      }

      const result = await response.json();
      const newCharacterId = result.doc.id.toString();
      const newCharacterName = result.doc.name;

      // Add to the characters dropdown options with characterType
      characters = [...characters, {
        value: newCharacterId,
        label: newCharacterName,
        characterType: characterType
      }];

      // Add to selected characters
      selectedCharacters = [...selectedCharacters, newCharacterId];

      toast.success(`${characterType === 'fan' ? 'Fan' : 'Official'} character "${newCharacterName}" created and added!`);
      characterSheetOpen = false;
      closeCharacterSheet();
    } catch (error) {
      console.error('[Upload Form] Failed to create character:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create character');
      characterFormErrors = { name: 'Failed to create character. Please try again.' };
    } finally {
      characterSubmitting = false;
    }
  }

  async function submitContributorSuggestion() {
    const errs: Record<string, string> = {};
    if (!contributorForm.name.trim()) errs.name = 'Contributor name is required';
    contributorFormErrors = errs;
    if (Object.keys(errs).length > 0) return;

    contributorSubmitting = true;
    try {
      const response = await fetch('/api/contributors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: contributorForm.name.trim() })
      });

      console.log('[Upload Form] Contributor creation response status:', response.status);

      // Check content type to see if we got JSON back
      const contentType = response.headers.get('content-type');
      console.log('[Upload Form] Response content-type:', contentType);

      if (!response.ok) {
        // Try to parse as JSON, but fall back to text if it fails
        let errorMessage = 'Failed to create contributor';
        try {
          const errorData = await response.json();
          console.error('[Upload Form] Contributor creation error response:', errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          console.error('[Upload Form] Non-JSON error response:', errorText);
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const newContributorId = result.doc.id.toString();
      const newContributorName = result.doc.name;

      // Add to the contributors dropdown options
      contributors = [...contributors, { value: newContributorId, label: newContributorName }];

      // Add to selected contributors
      selectedContributors = [...selectedContributors, newContributorId];

      toast.success(`Contributor "${newContributorName}" created and added!`);
      contributorSheetOpen = false;
      closeContributorSheet();
    } catch (error) {
      console.error('[Upload Form] Failed to create contributor:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create contributor');
      contributorFormErrors = { name: 'Failed to create contributor. Please try again.' };
    } finally {
      contributorSubmitting = false;
    }
  }


  // Track previous section to clear characters when switching between official/fan
  let previousSection = $state('');

  // Clear selected characters when switching between official/fan character sections
  $effect(() => {
    // Clear characters when switching between section 1 (official) and 13 (fan)
    if (previousSection && section) {
      const switchingBetweenCharacterTypes =
        (previousSection === '1' && section === '13') ||
        (previousSection === '13' && section === '1');

      if (switchingBetweenCharacterTypes) {
        selectedCharacters = [];
      }
    }
    previousSection = section;
  });

  // Prefill form data when in edit mode
  $effect(() => {
    if (isEditMode && sprite) {
      console.log('[Upload Form] Prefilling form with sprite data:', sprite);

      title = sprite.title || '';
      description = sprite.description || '';

      // Extract styleSourceType and related fields
      if (sprite.styleSourceType) {
        styleSourceType = sprite.styleSourceType;

        if (sprite.styleTeam) {
          styleTeam = typeof sprite.styleTeam === 'object' ? sprite.styleTeam.id.toString() : sprite.styleTeam.toString();
        }

        if (sprite.styleOfficialGame) {
          styleOfficialGame = typeof sprite.styleOfficialGame === 'object' ? sprite.styleOfficialGame.id.toString() : sprite.styleOfficialGame.toString();
        }

        if (sprite.styleFanGame) {
          styleFanGame = typeof sprite.styleFanGame === 'object' ? sprite.styleFanGame.id.toString() : sprite.styleFanGame.toString();
        }

        if (sprite.styleSeries) {
          styleSeries = typeof sprite.styleSeries === 'object' ? sprite.styleSeries.id.toString() : sprite.styleSeries.toString();
        }
      }

      if (sprite.section) {
        section = typeof sprite.section === 'object' ? sprite.section.id.toString() : sprite.section.toString();
      }

      // Handle array fields
      if (sprite.characters && Array.isArray(sprite.characters)) {
        selectedCharacters = sprite.characters.map((c: any) =>
          typeof c === 'object' ? c.id.toString() : c.toString()
        );
      }

      if (sprite.contributors && Array.isArray(sprite.contributors)) {
        selectedContributors = sprite.contributors.map((c: any) =>
          typeof c === 'object' ? c.id.toString() : c.toString()
        );
      }

      // Handle terms of use
      if (sprite.termsOfUse) {
        contactForPermissions = sprite.termsOfUse.contactForPermissions || false;
        informWhenUsed = sprite.termsOfUse.informWhenUsed || false;
        creditWhereUsed = sprite.termsOfUse.creditWhereUsed || false;
      }
    }
  });

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    // Log current form state for debugging
    console.log('[Upload Form] Validating form state:', {
      title: title || '(empty)',
      spriteImage: spriteImage?.name || '(none)',
      iconImage: iconImage?.name || '(none)',
      styleSourceType: styleSourceType || '(empty)',
      styleTeam: styleTeam || '(empty)',
      styleOfficialGame: styleOfficialGame || '(empty)',
      styleFanGame: styleFanGame || '(empty)',
      styleSeries: styleSeries || '(empty)',
      section: section || '(empty)',
      selectedCharacters,
      selectedContributors
    });

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length > 2048) {
      newErrors.description = 'Description must be 2048 characters or less';
    }

    // Images are required for new uploads, optional for edits
    if (!isEditMode && !spriteImage) {
      newErrors.spriteImage = 'Sprite sheet image is required';
    }

    if (!isEditMode && !iconImage) {
      newErrors.iconImage = 'Icon image is required';
    }

    if (!styleSourceType) {
      newErrors.styleSourceType = 'Style source type is required';
    }

    if (styleSourceType === 'team' && !styleTeam) {
      newErrors.styleTeam = 'Project team is required';
    }

    if (styleSourceType === 'officialGame' && !styleOfficialGame) {
      newErrors.styleOfficialGame = 'Official game is required';
    }

    if (styleSourceType === 'fanGame' && !styleFanGame) {
      newErrors.styleFanGame = 'Fan game is required';
    }

    if (styleSourceType === 'series' && !styleSeries) {
      newErrors.styleSeries = 'Series is required';
    }

    if (!section) {
      newErrors.section = 'Section is required';
    }

    errors = newErrors;

    // Log validation result
    if (Object.keys(newErrors).length > 0) {
      console.log('[Upload Form] Validation failed:', newErrors);
    } else {
      console.log('[Upload Form] Validation passed');
    }

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    console.log('[Upload Form] Submit button clicked');

    if (!validateForm()) {
      // Show detailed error message
      const errorCount = Object.keys(errors).length;
      const errorFields = Object.keys(errors).map(k => fieldLabels[k] || k).join(', ');
      toast.error(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''}: ${errorFields}`);

      // Scroll to error summary
      const errorSummary = document.querySelector('.error-summary');
      if (errorSummary) {
        errorSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    isSubmitting = true;
    console.log('[Upload Form] Starting submission...');

    try {
      const formData = new FormData();

      // Basic info
      formData.append('title', title);
      formData.append('description', description);

      // Images - only append if new files were selected
      // In edit mode, if no new file is selected, the backend will keep the existing image
      if (spriteImage) {
        formData.append('image', spriteImage);
      }
      if (iconImage) {
        formData.append('iconImage', iconImage);
      }

      // Style source type and related fields
      formData.append('styleSourceType', styleSourceType);
      if (styleSourceType === 'team' && styleTeam) {
        formData.append('styleTeam', styleTeam);
      }
      if (styleSourceType === 'officialGame' && styleOfficialGame) {
        formData.append('styleOfficialGame', styleOfficialGame);
      }
      if (styleSourceType === 'fanGame' && styleFanGame) {
        formData.append('styleFanGame', styleFanGame);
      }
      if (styleSourceType === 'series' && styleSeries) {
        formData.append('styleSeries', styleSeries);
      }

      // Terms of use
      formData.append('termsOfUse', JSON.stringify({
        contactForPermissions,
        informWhenUsed,
        creditWhereUsed
      }));

      // Categorization
      formData.append('section', section);
      if (selectedCharacters.length > 0) {
        formData.append('characters', JSON.stringify(selectedCharacters));
      }

      // Contributors
      if (selectedContributors.length > 0) {
        formData.append('contributors', JSON.stringify(selectedContributors));
      }

      // Determine endpoint and method based on edit mode
      const endpoint = isEditMode ? `/api/sprites/${sprite.id}` : '/api/sprites';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        // Log the full error response for debugging
        console.error('[Upload Form] API error response:', {
          status: response.status,
          message: result.message,
          errors: result.errors,
          fullResponse: result
        });

        // Build detailed error message
        let errorMessage = result.message || (isEditMode ? 'Failed to update sprite' : 'Failed to submit sprite');
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          const errorDetails = result.errors.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.message) return `${err.field || 'Error'}: ${err.message}`;
            return JSON.stringify(err);
          }).join('\n');
          errorMessage += '\n\nDetails:\n' + errorDetails;
        }

        throw new Error(errorMessage);
      }

      toast.success(isEditMode ? 'Sprite updated successfully! Redirecting to your uploads...' : 'Sprite submitted successfully! Redirecting to your uploads...');

      // Redirect to the uploads page where user can track their submission status
      setTimeout(() => {
        window.location.href = '/profile/uploads';
      }, 1500);

    } catch (error) {
      console.error('[Upload Form] Submit error:', error);

      // Show detailed error in toast
      let errorMessage = isEditMode ? 'Failed to update sprite' : 'Failed to submit sprite';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, {
        duration: 5000,
        description: 'Check the console for more details'
      });
    } finally {
      isSubmitting = false;
      console.log(`[Upload Form] ${isEditMode ? 'Update' : 'Submission'} complete`);
    }
  }
</script>

<form class="sprite-upload-form" bind:this={formRef} onsubmit={handleSubmit}>
  <!-- Error Summary -->
  {#if errorMessages.length > 0}
    <div class="error-summary">
      <div class="error-summary-header">
        <span class="error-icon">!</span>
        <span>Please fix the following {errorMessages.length} error{errorMessages.length > 1 ? 's' : ''} before submitting:</span>
      </div>
      <ul class="error-list">
        {#each errorMessages as { field, message }}
          <li><strong>{field}:</strong> {message}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Section 1: Basic Information -->
  <div class="form-section">
    <div class="main-content-title">Basic Information</div>
    <div class="main-content-box">
      <div class="form-grid">
        <FormInput
          themed
          label="Sheet Title"
          name="title"
          bind:value={title}
          placeholder="e.g., Sonic - Full Movement Set"
          required
          maxLength={100}
          error={errors.title}
          helperText="Give your sprite sheet a descriptive name"
        />

        <FormTextarea
          themed
          label="Description"
          name="description"
          bind:value={description}
          placeholder="Describe what's included in this sprite sheet"
          rows={4}
          required
          maxLength={2048}
          error={errors.description}
          helperText="Tell us about your sprite sheet (required)"
        />
      </div>
    </div>
  </div>

  <!-- Section 2: Images -->
  <div class="form-section">
    <div class="main-content-title">Images</div>
    <div class="main-content-box">
      <div class="form-grid two-cols">
        <FileUploadField
          themed
          name="image"
          label="Sprite Sheet Image"
          accept="image/png,image/gif"
          required={!isEditMode}
          bind:value={spriteImage}
          error={errors.spriteImage}
          helperText={isEditMode ? 'Upload a new image to replace the existing one (optional)' : 'PNG or GIF, max 2MB'}
          existingImageUrl={isEditMode && sprite?.image?.url ? sprite.image.url : null}
          maxSize={2097152}
        />

        <FileUploadField
          themed
          name="iconImage"
          label="Icon Image"
          accept="image/png,image/gif"
          required={!isEditMode}
          bind:value={iconImage}
          error={errors.iconImage}
          helperText={isEditMode ? 'Upload a new icon to replace the existing one (optional)' : 'Max 100KB, 103x71px (PNG or GIF)'}
          existingImageUrl={isEditMode && sprite?.iconImage?.url ? sprite.iconImage.url : null}
          maxSize={102400}
          maxWidth={103}
          maxHeight={71}
        />
      </div>
    </div>
  </div>

  <!-- Section 3: Style Source -->
  <div class="form-section">
    <div class="main-content-title">Style Source</div>
    <div class="main-content-box">
      <div class="form-grid">
        <div class="field-wrapper full">
          <label for="styleSourceType" class="theme-label">Style Source Type <span class="required-asterisk">*</span></label>
          <Select
            themed
            options={styleSourceTypeOptions}
            bind:value={styleSourceType}
            placeholder="-- Select Style Source Type --"
          />
          {#if errors.styleSourceType}
            <span class="field-error">{errors.styleSourceType}</span>
          {:else}
            <span class="field-helper">What is this sprite styled after?</span>
          {/if}
        </div>

        {#if showStyleTeam}
          <SelectWithSuggest
            themed
            label="Project Team"
            name="styleTeam"
            options={teams}
            bind:value={styleTeam}
            placeholder="-- Select Project Team --"
            required
            error={errors.styleTeam}
            helperText="The project team this sprite is styled after"
            onAddNew={openTeamSheet}
          />
        {/if}

        {#if showStyleOfficialGame}
          <SelectWithSuggest
            themed
            label="Official Game"
            name="styleOfficialGame"
            options={officialGames}
            bind:value={styleOfficialGame}
            placeholder="-- Select Official Game --"
            required
            error={errors.styleOfficialGame}
            helperText="The official game this sprite is styled after"
            onAddNew={openOfficialGameSheet}
          />
        {/if}

        {#if showStyleFanGame}
          <SelectWithSuggest
            themed
            label="Fan Game"
            name="styleFanGame"
            options={fanGames}
            bind:value={styleFanGame}
            placeholder="-- Select Fan Game --"
            required
            error={errors.styleFanGame}
            helperText="The fan game this sprite is styled after"
            onAddNew={openFanGameSheet}
          />
        {/if}

        {#if showStyleSeries}
          <SelectWithSuggest
            themed
            label="Series"
            name="styleSeries"
            options={series}
            bind:value={styleSeries}
            placeholder="-- Select Series --"
            required
            error={errors.styleSeries}
            helperText="The series this sprite is styled after"
            onAddNew={openSeriesSheet}
          />
        {/if}
      </div>
    </div>
  </div>

  <!-- Section 4: Categorization -->
  <div class="form-section">
    <div class="main-content-title">Categorization</div>
    <div class="main-content-box">
      <div class="form-grid">
        <SelectWithSuggest
          themed
          label="Section"
          name="section"
          options={sections}
          bind:value={section}
          placeholder="-- Select Section --"
          required
          error={errors.section}
          helperText="Type of sprite sheet (Characters, Objects, etc.)"
          onAddNew={openSectionSheet}
        />

        {#if showCharacters}
          <MultiSelect
            themed
            label={section === '13' ? 'Fan Characters' : 'Official Characters'}
            name="characters"
            options={filteredCharacters}
            bind:value={selectedCharacters}
            placeholder={section === '13' ? 'Select fan characters' : 'Select official characters'}
            helperText={section === '13' ? 'Select the fan characters featured in this sheet' : 'Select the official characters featured in this sheet'}
            onAddNew={openCharacterSheet}
          />
        {/if}
      </div>
    </div>
  </div>

  <!-- Section 5: Contributors -->
  <div class="form-section">
    <div class="main-content-title">Contributors</div>
    <div class="main-content-box">
      <div class="form-grid">
        <MultiSelect
          themed
          label="Contributors"
          name="contributors"
          options={contributors}
          bind:value={selectedContributors}
          placeholder="Select contributors"
          helperText="Select any contributors who worked on this (optional)"
          onAddNew={openContributorSheet}
        />
      </div>
    </div>
  </div>

  <!-- Section 6: Terms of Use -->
  <div class="form-section">
    <div class="main-content-title">Terms of Use</div>
    <div class="main-content-box">
      <p class="terms-description">
        Select how others may use your sprite sheet. These terms will be displayed to users viewing your work.
      </p>
      <div class="form-grid">
        <FormCheckbox
          themed
          bind:checked={contactForPermissions}
          label="Contact for Permissions"
          description="Users must contact you before using this sprite"
        />

        <FormCheckbox
          themed
          bind:checked={informWhenUsed}
          label="Inform When Used"
          description="Users should inform you when they use this sprite"
        />

        <FormCheckbox
          themed
          bind:checked={creditWhereUsed}
          label="Credit Where Used"
          description="Users must credit you when using this sprite"
        />
      </div>
    </div>
  </div>

  <!-- Submit -->
  <div class="form-actions">
    <Button themed type="submit" disabled={isSubmitting}>
      {#if isSubmitting}
        {isEditMode ? 'Updating...' : 'Submitting...'}
      {:else}
        {isEditMode ? 'Update Sprite' : 'Submit Sprite'}
      {/if}
    </Button>
    <p class="submit-note">
      {isEditMode
        ? 'Your updated sprite will be resubmitted for review.'
        : 'Your sprite will be submitted for review before being published.'}
    </p>
  </div>
</form>

<!-- Team Suggestion Sheet -->
<Sheet
  bind:open={teamSheetOpen}
  title="Suggest New Project Team"
  description="Can't find the project team you're looking for? Suggest a new one to be added. Your suggestion will be reviewed by moderators."
  onClose={closeTeamSheet}
>
  <div class="sheet-form">
    <FormInput
      themed
      label="Team Name"
      name="teamName"
      bind:value={teamForm.name}
      placeholder="Enter team name..."
      required
      error={teamFormErrors.name}
    />
  </div>

  {#snippet footer()}
    <Button themed onclick={() => { teamSheetOpen = false; closeTeamSheet(); }} class="sheet-cancel-btn">
      Cancel
    </Button>
    <Button themed onclick={submitTeamSuggestion} class="sheet-submit-btn" disabled={teamSubmitting}>
      {#if teamSubmitting}
        <Loader2 class="h-4 w-4 animate-spin" />
      {/if}
      Add Suggestion
    </Button>
  {/snippet}
</Sheet>

<!-- Official Game Suggestion Sheet -->
<Sheet
  bind:open={officialGameSheetOpen}
  title="Suggest New Official Game"
  description="Can't find the official game you're looking for? Suggest a new one to be added. Your suggestion will be reviewed by moderators."
  onClose={closeOfficialGameSheet}
>
  <div class="sheet-form">
    <FormInput
      themed
      label="Game Name"
      name="officialGameName"
      bind:value={officialGameForm.name}
      placeholder="Enter game name..."
      required
      error={officialGameFormErrors.name}
    />

    <FormInput
      themed
      label="Release Year"
      name="officialGameYear"
      bind:value={officialGameForm.year}
      placeholder="e.g., 1994"
      required
      error={officialGameFormErrors.year}
      helperText="The year this game was released"
    />
  </div>

  {#snippet footer()}
    <Button themed onclick={() => { officialGameSheetOpen = false; closeOfficialGameSheet(); }} class="sheet-cancel-btn">
      Cancel
    </Button>
    <Button themed onclick={submitOfficialGameSuggestion} class="sheet-submit-btn" disabled={officialGameSubmitting}>
      {#if officialGameSubmitting}
        <Loader2 class="h-4 w-4 animate-spin" />
      {/if}
      Add Suggestion
    </Button>
  {/snippet}
</Sheet>

<!-- Fan Game Suggestion Sheet -->
<Sheet
  bind:open={fanGameSheetOpen}
  title="Suggest New Fan Game"
  description="Can't find the fan game you're looking for? Suggest a new one to be added. Your suggestion will be reviewed by moderators."
  onClose={closeFanGameSheet}
>
  <div class="sheet-form">
    <FormInput
      themed
      label="Game Name"
      name="fanGameName"
      bind:value={fanGameForm.name}
      placeholder="Enter game name..."
      required
      error={fanGameFormErrors.name}
    />

    <FormInput
      themed
      label="Release Year"
      name="fanGameYear"
      bind:value={fanGameForm.year}
      placeholder="e.g., 2010"
      required
      error={fanGameFormErrors.year}
      helperText="The year this fan game was released"
    />
  </div>

  {#snippet footer()}
    <Button themed onclick={() => { fanGameSheetOpen = false; closeFanGameSheet(); }} class="sheet-cancel-btn">
      Cancel
    </Button>
    <Button themed onclick={submitFanGameSuggestion} class="sheet-submit-btn" disabled={fanGameSubmitting}>
      {#if fanGameSubmitting}
        <Loader2 class="h-4 w-4 animate-spin" />
      {/if}
      Add Suggestion
    </Button>
  {/snippet}
</Sheet>

<!-- Series Suggestion Sheet -->
<Sheet
  bind:open={seriesSheetOpen}
  title="Suggest New Series"
  description="Can't find the series you're looking for? Suggest a new one to be added. Your suggestion will be reviewed by moderators."
  onClose={closeSeriesSheet}
>
  <div class="sheet-form">
    <FormInput
      themed
      label="Series Name"
      name="seriesName"
      bind:value={seriesForm.name}
      placeholder="Enter series name..."
      required
      error={seriesFormErrors.name}
    />

    <FormInput
      themed
      label="Release Year"
      name="seriesYear"
      bind:value={seriesForm.year}
      placeholder="e.g., 1999"
      required
      error={seriesFormErrors.year}
      helperText="The year this series was released"
    />
  </div>

  {#snippet footer()}
    <Button themed onclick={() => { seriesSheetOpen = false; closeSeriesSheet(); }} class="sheet-cancel-btn">
      Cancel
    </Button>
    <Button themed onclick={submitSeriesSuggestion} class="sheet-submit-btn" disabled={seriesSubmitting}>
      {#if seriesSubmitting}
        <Loader2 class="h-4 w-4 animate-spin" />
      {/if}
      Add Suggestion
    </Button>
  {/snippet}
</Sheet>

<!-- Section Suggestion Sheet -->
<Sheet
  bind:open={sectionSheetOpen}
  title="Suggest New Section"
  description="Can't find the section type you need? Suggest a new one to be added. Your suggestion will be reviewed by moderators."
  onClose={closeSectionSheet}
>
  <div class="sheet-form">
    <FormInput
      themed
      label="Section Name"
      name="sectionName"
      bind:value={sectionForm.name}
      placeholder="Enter section name..."
      required
      error={sectionFormErrors.name}
      helperText="e.g., Vehicles, UI Elements, etc."
    />
  </div>

  {#snippet footer()}
    <Button themed onclick={() => { sectionSheetOpen = false; closeSectionSheet(); }} class="sheet-cancel-btn">
      Cancel
    </Button>
    <Button themed onclick={submitSectionSuggestion} class="sheet-submit-btn" disabled={sectionSubmitting}>
      {#if sectionSubmitting}
        <Loader2 class="h-4 w-4 animate-spin" />
      {/if}
      Add Suggestion
    </Button>
  {/snippet}
</Sheet>

<!-- Character Suggestion Sheet -->
<Sheet
  bind:open={characterSheetOpen}
  title={section === '13' ? 'Suggest New Fan Character' : 'Suggest New Official Character'}
  description={section === '13'
    ? "Can't find the fan character you're looking for? Suggest a new one to be added. Your suggestion will be reviewed by moderators."
    : "Can't find the official character you're looking for? Suggest a new one to be added. Your suggestion will be reviewed by moderators."}
  onClose={closeCharacterSheet}
>
  <div class="sheet-form">
    <FormInput
      themed
      label="Character Name"
      name="characterName"
      bind:value={characterForm.name}
      placeholder="Enter character name..."
      required
      error={characterFormErrors.name}
    />
  </div>

  {#snippet footer()}
    <Button themed onclick={() => { characterSheetOpen = false; closeCharacterSheet(); }} class="sheet-cancel-btn">
      Cancel
    </Button>
    <Button themed onclick={submitCharacterSuggestion} class="sheet-submit-btn" disabled={characterSubmitting}>
      {#if characterSubmitting}
        <Loader2 class="h-4 w-4 animate-spin" />
      {/if}
      Add Suggestion
    </Button>
  {/snippet}
</Sheet>

<!-- Contributor Suggestion Sheet -->
<Sheet
  bind:open={contributorSheetOpen}
  title="Add New Contributor"
  description="Can't find the contributor you're looking for? Add a new one to the list."
  onClose={closeContributorSheet}
>
  <div class="sheet-form">
    <FormInput
      themed
      label="Contributor Name"
      name="contributorName"
      bind:value={contributorForm.name}
      placeholder="Enter contributor name..."
      required
      error={contributorFormErrors.name}
    />
  </div>

  {#snippet footer()}
    <Button themed onclick={() => { contributorSheetOpen = false; closeContributorSheet(); }} class="sheet-cancel-btn">
      Cancel
    </Button>
    <Button themed onclick={submitContributorSuggestion} class="sheet-submit-btn" disabled={contributorSubmitting}>
      {#if contributorSubmitting}
        <Loader2 class="h-4 w-4 animate-spin" />
      {/if}
      Add Contributor
    </Button>
  {/snippet}
</Sheet>

<style>
  .sprite-upload-form {
    display: flex;
    flex-direction: column;
    max-width: 800px;
    margin: 0 auto;
  }

  .form-section {
    display: flex;
    flex-direction: column;
  }

  .main-content-title {
    display: block;
    background: color-mix(in srgb, var(--page-color) 60%, black);
    padding: 3px 0px 3px 15px;
    font-family: 'saira';
    font-weight: 800;
    font-size: 18px;
    text-shadow: calc(1px * var(--multiply-factor)) 0 0 var(--bg-color),
                 calc(1px * var(--multiply-factor)) calc(1px * var(--multiply-factor)) 0 var(--bg-color),
                 0 calc(1px * var(--multiply-factor)) 0 var(--bg-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
  }

  .main-content-box {
    background: var(--page-color);
    padding: 20px;
    border-left: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-bottom: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    border-right: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  .form-grid {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
  }

  .form-grid.two-cols {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--gap);
  }

  @media (max-width: 768px) {
    .form-grid.two-cols {
      grid-template-columns: 1fr;
    }
  }

  .field-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-wrapper.full {
    width: 100%;
  }

  .theme-label {
    display: block;
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 14px;
    color: var(--font-color);
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }

  .required-asterisk {
    color: #ef4444;
    margin-left: 2px;
  }

  .field-error {
    font-size: 12px;
    color: #ef4444;
  }

  .field-helper {
    font-size: 12px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
  }

  .form-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--gap);
    padding: 24px;
    background: var(--page-color);
    border: var(--border-width) var(--border-style) color-mix(in srgb, var(--page-color) 80%, white);
    box-shadow: var(--box-shadow);
  }

  .submit-note {
    font-family: 'saira', monospace;
    font-size: 12px;
    color: color-mix(in srgb, var(--font-color) 60%, transparent);
    text-align: center;
  }

  :global(.sprite-upload-form button[type="submit"]) {
    padding: 12px 40px;
    font-size: 16px;
  }

  /* Error Summary Styles */
  .error-summary {
    background: color-mix(in srgb, #ef4444 15%, var(--page-color));
    border: 2px solid #ef4444;
    padding: 16px;
    margin-bottom: 8px;
  }

  .error-summary-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'saira', monospace;
    font-weight: 700;
    font-size: 14px;
    color: #ef4444;
    margin-bottom: 12px;
  }

  .error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: #ef4444;
    color: white;
    font-weight: 800;
    font-size: 16px;
  }

  .error-list {
    margin: 0;
    padding-left: 34px;
    list-style-type: none;
  }

  .error-list li {
    font-family: 'saira', monospace;
    font-size: 13px;
    color: var(--font-color);
    padding: 4px 0;
    position: relative;
  }

  .error-list li::before {
    content: "•";
    color: #ef4444;
    position: absolute;
    left: -16px;
  }

  .error-list li strong {
    color: #ef4444;
  }

  /* Sheet Form Styles */
  .sheet-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  :global(.sheet-cancel-btn) {
    flex: 1;
    background: color-mix(in srgb, var(--page-color) 60%, black) !important;
    border: 1px solid color-mix(in srgb, var(--page-color) 80%, white) !important;
  }

  :global(.sheet-submit-btn) {
    flex: 1;
  }

  /* Terms of Use Styles */
  .terms-description {
    font-family: 'saira', monospace;
    font-size: 14px;
    color: var(--font-color);
    margin-bottom: 16px;
    line-height: 1.5;
    text-shadow: 1px 0px 0 var(--bg-color), 1px 1px 0 var(--bg-color), 0px 1px 0 var(--bg-color);
  }
</style>
