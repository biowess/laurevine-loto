export const createPanels = ({ ui: { kit } }, ex) => [{
  id: 'files', side: 'left', icon: 'folder-tree', title: 'Explorer',
  actions: [kit.act('refresh-cw', 'explorer.refresh'), kit.act('archive-restore', 'explorer.recover-deleted'), kit.act('locate-fixed', 'explorer.reveal-active'), kit.act('eye', 'explorer.toggle-hidden'), kit.act('arrow-down-a-z', 'explorer.sort')],
  render: ex.render,
}];
