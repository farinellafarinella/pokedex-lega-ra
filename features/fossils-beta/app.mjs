// Compatibility entry for previously published laboratory pages.
// All battles now use the shared Route interface and the authenticated team.
const laboratory = new URL('../../index.html#fossil-arena', import.meta.url);
window.top.location.replace(laboratory.href);
