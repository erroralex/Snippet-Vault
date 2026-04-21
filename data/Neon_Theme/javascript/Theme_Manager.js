/**
 * Theme Manager
 * Description: Dynamically swaps the theme stylesheet with a native crossfade.
 */

function switchTheme(themeName) {
    const themeStylesheet = document.getElementById('theme-stylesheet');
    const newHref = `css/themes/${themeName}.css`;

    // Prevent reloading if the requested theme is already active
    if (themeStylesheet.getAttribute('href') === newHref) return;

    // Use the View Transitions API for a native, smooth crossfade
    if (document.startViewTransition) {
        document.startViewTransition(() => {
            themeStylesheet.setAttribute('href', newHref);
        });
    } else {
        // Fallback for older browsers without View Transitions support
        themeStylesheet.setAttribute('href', newHref);
    }
}

// Example Trigger:
// document.getElementById('btn-synthwave').addEventListener('click', () => switchTheme('synthwave'));
