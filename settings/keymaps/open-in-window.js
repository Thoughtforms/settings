// This script is the action for the "Alt-Enter" keyboard shortcut.
// It is context-aware:
// 1. If the cursor is on a wikilink, it opens that link in a new floating window.
// 2. If NOT on a wikilink, it creates and opens a new scratchpad in a new floating window.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

/**
 * Generates a unique path for a new scratchpad file.
 * This is self-contained to avoid module import issues in the executor.
 * @param {Git} gitClient - The git client instance for the garden.
 * @returns {Promise<string>} A promise that resolves to the unique scratchpad file path.
 */
async function generateUniqueScratchpadPath(gitClient) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const baseName = `${year}${month}${day}-${hours}${minutes}`;
  const baseDir = '/scratchpad';

  await gitClient.ensureDir(baseDir);

  let finalPath = `${baseDir}/${baseName}`;
  let counter = 0;

  while (true) {
    try {
      await gitClient.pfs.stat(finalPath);
      counter++;
      finalPath = `${baseDir}/${baseName}-${counter}`;
    } catch (e) {
      if (e.code === 'ENOENT') break;
      throw e;
    }
  }
  return finalPath;
}


const view = editor.editorView;
if (!view) {
  console.error('[open-in-window] Editor view not found.');
  return false;
}

const pos = view.state.selection.main.head;
const line = view.state.doc.lineAt(pos);
const wikilinkRegex = /\[\[([^\[\]]+?)\]\]/g;
let match;
wikilinkRegex.lastIndex = 0;

// --- Case 1: Cursor is on a wikilink ---
while ((match = wikilinkRegex.exec(line.text))) {
  const start = line.from + match.index;
  const end = start + match[0].length;

  if (pos >= start && pos <= end) {
    const linkContent = match[1];
    
    const getLinkURL = (content) => {
        let path = content.split('|')[0].trim();
        let garden = git.gardenName;
        if (path.includes('#')) [garden, path] = path.split('#');
        return `/${encodeURIComponent(garden)}#${encodeURI(path)}?windowed=true`;
    };

    const url = getLinkURL(linkContent);
    const isNested = window.self !== window.top;
    
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;

    if (isNested) {
        window.top.postMessage({
            type: 'request-preview-window',
            payload: { url, clientX: x, clientY: y }
        }, '*');
    } else if (typeof window.thoughtform.ui.openWindow === 'function') {
        window.thoughtform.ui.openWindow(url, x, y);
    } else {
        console.error("[open-in-window] Windowing function not available.");
    }
    
    // The event was handled successfully.
    return true;
  }
}

// --- Case 2: Cursor is NOT on a wikilink (Fallback) ---
// This part of the script only runs if the loop above did not find a link.
console.log('[open-in-window] No wikilink found at cursor. Creating new scratchpad window.');

(async () => {
  try {
    const newPath = await generateUniqueScratchpadPath(git);
    if (!newPath) return;

    // Construct the URL for the new scratchpad window.
    const url = `/${git.gardenName}#${newPath}?windowed=true`;

    const isNested = window.self !== window.top;
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;

    if (isNested) {
        window.top.postMessage({
            type: 'request-preview-window',
            payload: { url, clientX: x, clientY: y }
        }, '*');
    } else if (typeof window.thoughtform.ui.openWindow === 'function') {
        window.thoughtform.ui.openWindow(url, x, y);
    } else {
        console.error("[open-in-window] Windowing function not available.");
    }
  } catch (error) {
    console.error('[open-in-window] Failed to create scratchpad window:', error);
  }
})();

// The event was handled, whether a link was found or a scratchpad was created.
return true;