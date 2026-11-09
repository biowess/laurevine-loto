const pages = new Map();

export const preferencePages = {
  register(p) {
    if (!p || !/^[a-z][a-z0-9-]*$/.test(p.id || '') || typeof p.title !== 'string' || !p.title) throw new TypeError(`preferences: bad page "${p && p.id}"`);
    pages.set(p.id, Object.freeze({ icon: 'settings', sections: [], planned: false, ...p }));
  },
  get: (id) => pages.get(id),
  list: () => [...pages.values()],
};
