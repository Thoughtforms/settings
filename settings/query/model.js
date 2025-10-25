// This script runs automatically when you navigate to a URL with `?model=...`
// It overrides the AI model for the current editor session only.
// The key is case-insensitive.
//
// The 'params' variable is available and contains the parsed URL query parameters.
// The 'editor' variable is the instance for the current pane.

if (params && params.model && editor) {
  editor.aiOverrides.customModelName = params.model;
}