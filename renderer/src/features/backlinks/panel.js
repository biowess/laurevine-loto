import { createBacklinks } from './view.js';

export const createPanels = (ctx) => ['left', 'right'].map((side) => ({ id: 'backlinks', side, icon: 'link-2', title: 'Backlinks', render: createBacklinks(ctx).render }));
