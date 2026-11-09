// Classic blocking script (no imports): runs before first paint so the theme never flashes.
// Reads the cached choice written by ui/shell/window-chrome.js; the persisted setting wins once the app boots.
(function () {
  var root = document.documentElement, theme = 'light', ua = navigator.userAgent;
  try { theme = localStorage.getItem('loto.theme') || 'light'; } catch (e) { /* storage unavailable */ }
  if (theme !== 'dark' && theme !== 'system') theme = 'light';
  if (theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) root.dataset.theme = 'dark';
  try {
    var tv = JSON.parse(localStorage.getItem('loto.themeVars') || 'null'), cur = tv && tv[root.dataset.theme === 'dark' ? 'dark' : 'light'];
    if (cur && typeof cur === 'object') for (var k in cur) {
      if (/^[a-z][a-z0-9-]{0,20}$/.test(k) && typeof cur[k] === 'string' && cur[k].length <= 200 && /^[#a-zA-Z0-9 ,.%'"()\/-]+$/.test(cur[k]) && !/url|import|expression/i.test(cur[k])) root.style.setProperty('--' + k, cur[k]);
    }
  } catch (e) { /* cache unreadable */ }
  root.dataset.platform = /Mac/.test(ua) ? 'mac' : /Windows/.test(ua) ? 'win' : 'linux';
})();
