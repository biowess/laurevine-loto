export const createPanels = ({ ui: { kit } }, att) => [{
  id: 'attachments', side: 'left', icon: 'paperclip', title: 'Attachments',
  actions: [kit.act('upload', 'attachments.add'), kit.act('paperclip', 'attachments.manage'), kit.act('refresh-cw', 'attachments.refresh')],
  render: () => att.render(),
}];
