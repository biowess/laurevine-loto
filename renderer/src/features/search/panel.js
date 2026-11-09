export const createPanels = ({ ui: { kit } }, s) => [{
  id: 'search', side: 'left', icon: 'search', title: 'Search',
  actions: [kit.act('x', 'search.clear')],
  render: () => s.el,
}];
