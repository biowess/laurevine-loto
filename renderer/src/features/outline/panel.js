export const createPanels = ({ ui: { kit } }, o) => [{
  id: 'outline', side: 'right', icon: 'list-tree', title: 'Outline',
  actions: [kit.act('chevrons-up-down', 'outline.expand-all'), kit.act('chevrons-down-up', 'outline.collapse-all')],
  render: () => o.mount(),
}];
