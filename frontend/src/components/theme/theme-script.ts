export const THEME_STORAGE_KEY = "hsc95-theme";

/**
 * Runs synchronously in <head> before first paint (no flash, no hydration
 * mismatch): applies the saved theme, defaulting to dark.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;
