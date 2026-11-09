import { PROFILES, PROFILE_IDS } from '../../core/markdown/profiles.js';
import { mountPreview, docProfileId } from './preview-view.js';
import { writeText } from '../../services/clipboard-client.js';

export function register(ctx) {
  const { commands, ui, store, services } = ctx;
  const cur = () => docProfileId(ctx);
  for (const id of PROFILE_IDS) {
    commands.register({
      id: `preview.profile-${id}`, title: `Profile: ${PROFILES[id].label}`, group: 'Preview',
      checked: () => cur() === id,
      run: () => services.documents.setDocProfile(store.get().documents.activeId, id),
    });
  }
  commands.register({
    id: 'preview.profile-menu', title: 'Markdown Profile', group: 'Preview',
    run: () => ui.openMenu(document.getElementById('profbtn'), PROFILE_IDS.map((id) => ({
      label: PROFILES[id].label, checked: () => cur() === id, onSelect: () => commands.execute(`preview.profile-${id}`),
    }))),
  });
  commands.register({
    id: 'preview.copy-code', title: 'Copy Code Block', icon: 'copy', group: 'Preview',
    run: async (el) => {
      const code = el && el.closest && el.closest('.lt-code') && el.closest('.lt-code').querySelector('code');
      if (!code) return;
      await writeText(code.textContent.replace(/\n$/, ''));
      el.textContent = 'Copied';
      setTimeout(() => { el.textContent = 'Copy'; }, 1200);
    },
  });
  const mounted = new WeakSet(), slot = (el, n, offs) => { if (!el || mounted.has(el)) return; mounted.add(el); const off = mountPreview(ctx, { slot: n, el }); if (offs) offs.push(off); };
  document.addEventListener('loto:group-preview', (ev) => slot(ev.detail.el, ev.detail.slot, ev.detail.offs));
  setTimeout(() => { mountPreview(ctx); slot(document.querySelectorAll('.md-group')[1]?.querySelector('.md-prev'), 1); }, 0);
}
