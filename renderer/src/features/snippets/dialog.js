import { icon } from '../../ui/kit/icons.js';
import * as SC from '../../services/snippets-client.js';
import { confirmDialog } from '../files/dialogs.js';

export function openEditor(ctx, snippet, onSave) {
  const { ui: { h, openDialog, toast } } = ctx;
  const isNew = !snippet || !snippet.id;
  const nameIn = h('input', { class: 'input', type: 'text', placeholder: 'e.g. Callout Note', value: snippet?.name || '' });
  const trigIn = h('input', { class: 'input', type: 'text', placeholder: 'e.g. callout', value: snippet?.trigger || '' });
  const scopeIn = h('input', { class: 'input', type: 'text', placeholder: 'e.g. markdown (optional)', value: snippet?.scope || '' });
  const bodyIn = h('textarea', { class: 'input', style: 'min-height:120px;font-family:var(--mono,monospace);font-size:12.5px;resize:vertical', placeholder: '> [!${1:NOTE}]\n> $2', spellcheck: 'false' }, snippet?.body || '');

  const row = (label, note, input) => h('div', { class: 'lv-pf__row' }, h('div', { class: 'lv-pf__txt' }, h('label', {}, label), h('small', {}, note)), h('div', { class: 'lv-pf__ctl', style: 'width:100%' }, input));
  const help = h('div', { class: 'lv-int__guide', style: 'margin-top:6px;font-size:12px;color:var(--text-2)' },
    h('p', {}, h('strong', {}, 'Tab stops: '), '$1, $2 or ${1:placeholder}. Tab moves between stops.'),
    h('p', {}, h('strong', {}, 'Variables: '), '{{date}} inserts today’s date; {{selection}} inserts selected editor text.'));

  const body = h('div', { style: 'display:flex;flex-direction:column;gap:8px;max-width:540px' },
    row('Name', 'Identifier for library and menus', nameIn),
    row('Trigger', 'Word typed before Tab to expand', trigIn),
    row('Scope', 'Optional language/dialect filter', scopeIn),
    row('Body', 'Content to insert with tab stops', bodyIn),
    help);

  let dlg = null;
  const submit = async () => {
    const name = nameIn.value.trim(), trigger = trigIn.value.trim(), scope = scopeIn.value.trim(), text = bodyIn.value;
    if (!name) { toast('Please enter a name for the snippet.'); nameIn.focus(); return false; }
    if (!trigger) { toast('Please enter a trigger prefix for the snippet.'); trigIn.focus(); return false; }
    try {
      await onSave({ id: snippet?.id, name, trigger, scope, body: text });
      if (dlg) dlg.close();
      return true;
    } catch (err) {
      toast(err.message || 'Could not save snippet.');
      return false;
    }
  };

  dlg = openDialog({
    title: isNew ? 'New Snippet' : 'Edit Snippet',
    icon: 'scissors',
    width: 580,
    body,
    buttons: [
      { label: 'Cancel' },
      { label: isNew ? 'Create' : 'Save', primary: true, onClick: submit },
    ],
  });
}

export function openManager(ctx, { onInsert, onSelect } = {}) {
  const { commands, ui } = ctx, { h, openDialog, toast } = ui;
  let dlg = null, box = null, off = null;
  const all = async () => (await SC.list()).items;
  const fail = (err) => toast(err.message || 'Operation failed.', { timeout: 4000 });
  const act = (cmd, title, ic, fn) => h('button', { type: 'button', class: 'tbtn', title, 'aria-label': title, onclick: fn }, icon(ic));

  async function paint() {
    if (!box) return;
    let items = [];
    try { items = await all(); } catch (err) { return fail(err); }
    box.replaceChildren(...items.map((s) => h('div', { class: 'lv-trow' },
      icon('scissors'),
      h('div', { class: 'lv-tmeta', style: 'flex:1;min-width:0' },
        h('div', { style: 'display:flex;align-items:center;gap:8px' },
          h('b', {}, s.name),
          h('kbd', { style: 'font-size:11px;padding:1px 5px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r)' }, s.trigger),
          s.scope ? h('i', { class: 'lv-tag' }, s.scope) : null),
        h('small', { style: 'display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-2);max-width:360px' }, s.body.replace(/\n/g, ' ↵ '))),
      h('span', { class: 'lv-hacts' },
        onInsert ? act('ins', 'Insert Snippet', 'corner-down-left', () => { onInsert(s); if (dlg) dlg.close(); }) : null,
        act('edit', 'Edit Snippet', 'pen-line', () => {
          openEditor(ctx, s, async (data) => {
            await SC.update(data);
            toast(`Updated ${data.name}`);
            paint();
          });
        }),
        act('duplicate', 'Duplicate', 'copy', async () => {
          try { await SC.duplicate(s.id); toast('Snippet duplicated'); paint(); } catch (e) { fail(e); }
        }),
        act('export', 'Export…', 'file-down', async () => {
          try { await SC.exportOne(s.id); } catch (e) { fail(e); }
        }),
        act('delete', 'Delete', 'trash-2', async () => {
          if (!(await confirmDialog(ctx, { title: 'Delete Snippet', text: `Delete snippet “${s.name}”?`, label: 'Delete' }))) return;
          try { await SC.remove(s.id); toast('Snippet deleted'); paint(); } catch (e) { fail(e); }
        })))));
  }

  box = h('div', { class: 'lv-tlist', style: 'max-height:420px;overflow-y:auto' });
  off = SC.onChange(paint);
  paint();

  dlg = openDialog({
    title: 'Manage Snippets',
    icon: 'scissors',
    width: 680,
    body: box,
    buttons: [
      {
        label: 'Import…',
        onClick: async () => {
          try {
            const res = await SC.importFiles();
            if (res && res.ids && res.ids.length) toast(`Imported ${res.ids.length} snippet(s)`);
            paint();
          } catch (e) { fail(e); }
          return false;
        },
      },
      {
        label: 'New Snippet…',
        primary: true,
        onClick: () => {
          openEditor(ctx, null, async (data) => {
            await SC.save(data);
            toast(`Created ${data.name}`);
            paint();
          });
          return false;
        },
      },
      { label: 'Close' },
    ],
    onClose: () => { off(); dlg = null; box = null; SC.changed(); },
  });
}
