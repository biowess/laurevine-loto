export const createPanels = ({ ui: { kit } }, p) => [{
  id: 'properties', side: 'right', icon: 'info', title: 'Properties',
  actions: [kit.act('pencil', 'properties.edit')],
  render: () => p.mount(),
}];
