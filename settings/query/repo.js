// This script runs automatically when you navigate to a URL with `?repo=...`
// It prompts the user to clone the specified Git repository into a new garden.
//
// The 'params' variable is available and contains the parsed URL query parameters.
// The 'editor' variable is the instance for the current pane.

(async () => {
  if (!params || !params.repo) {
    return;
  }

  /**
   * Removes the 'repo' query parameter from the URL hash without reloading the page,
   * and crucially, updates the application's internal state to match.
   */
  function removeRepoParamFromUrl() {
    const currentUrl = new URL(window.location.href);
    const hash = currentUrl.hash;
    const hashParts = hash.split('?');
    
    if (hashParts.length > 1) {
      const hashParams = new URLSearchParams(hashParts[1]);
      if (hashParams.has('repo')) {
        hashParams.delete('repo');
        
        let newHash = hashParts[0];
        const newParamsString = hashParams.toString();
        if (newParamsString) {
          newHash += '?' + newParamsString;
        }
        
        // Step 1: Update the URL in the browser's address bar.
        window.history.replaceState(null, '', currentUrl.pathname + newHash);

        // --- THIS IS THE FIX ---
        // Step 2: Tell the workspace manager to re-read the URL and update its internal state.
        // This prevents the stale '?repo' parameter from being re-added on subsequent navigations.
        if (window.thoughtform && window.thoughtform.workspace) {
          window.thoughtform.workspace.updateSessionFromUrl();
        }
        // --- END OF FIX ---
      }
    }
  }

  const repoUrl = params.repo;
  const suggestedName = repoUrl.split('/').pop().replace('.git', '');
  
  const { Modal, Git } = window.thoughtform;

  try {
    const gardenName = await Modal.prompt({
      title: 'Clone Repository',
      label: `Enter a name for the new garden from "${repoUrl}":`,
      defaultValue: suggestedName
    });

    if (!gardenName || !gardenName.trim()) {
      console.log('[Repo Autoloader] Clone cancelled by user.');
      return; // Exit if the user cancels
    }
    
    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : [];

    if (gardens.includes(gardenName)) {
      const confirmed = await Modal.confirm({
        title: 'Garden Exists',
        message: `A garden named "${gardenName}" already exists. Do you want to overwrite it completely with the contents of the new repository? This cannot be undone.`,
        okText: 'Overwrite',
        destructive: true
      });
      if (!confirmed) {
        console.log('[Repo Autoloader] Overwrite cancelled by user.');
        return; // Exit if the user cancels the overwrite
      }
    }

    const cloneModal = new Modal({ title: `Cloning Repository...` });
    const logContainer = document.createElement('div');
    logContainer.style.fontFamily = 'monospace';
    logContainer.style.maxHeight = '300px';
    logContainer.style.overflowY = 'auto';
    cloneModal.updateContent('');
    cloneModal.content.appendChild(logContainer);
    cloneModal.show();

    let logHTML = '';
    const logCallback = (message) => {
      console.log(`[Clone Log] ${message}`);
      logHTML += `<div>${message}</div>`;
      logContainer.innerHTML = logHTML;
      logContainer.scrollTop = logContainer.scrollHeight;
    };

    try {
      const tempGitClient = new Git(gardenName);
      await tempGitClient.clone(repoUrl, gardenName, logCallback);
      
      cloneModal.addFooterButton('OK', () => {
        cloneModal.destroy();
        window.thoughtform.workspace.switchGarden(gardenName);
      });
    } catch (e) {
      logCallback(`<strong style="color: var(--base-accent-destructive);">A critical error occurred: ${e.message}</strong>`);
      console.error('[Repo Autoloader] A critical error occurred during clone:', e);
      cloneModal.addFooterButton('Close', () => cloneModal.destroy());
    }

  } finally {
    // This block ensures the URL is cleaned up regardless of whether the
    // clone was successful, was cancelled, or threw an error.
    removeRepoParamFromUrl();
  }
})();