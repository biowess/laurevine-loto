const GFM = ['table', 'strikethrough', 'tasklist', 'autolink'];
const EXT = ['callouts', 'footnotes', 'deflist', 'abbr', 'pagebreak', 'citations'];

const def = (id, label, plugins, flags) => Object.freeze({
  id, label, plugins: Object.freeze(plugins),
  flags: Object.freeze({ html: false, linkify: false, breaks: false, typographer: false, ...flags }),
});

export const PROFILES = Object.freeze({
  commonmark: def('commonmark', 'CommonMark', [], { commonmark: true }),
  gfm: def('gfm', 'GitHub Flavored', [...GFM, 'callouts', 'footnotes'], { linkify: true }),
  extended: def('extended', 'Extended', [...GFM, 'frontmatter', 'heading-ids', ...EXT], { linkify: true, typographer: true }),
  knowledge: def('knowledge', 'Knowledge', [...GFM, 'frontmatter', 'heading-ids', ...EXT, 'wikilinks'], { linkify: true, typographer: true, breaks: true }),
});

export const PROFILE_IDS = Object.freeze(Object.keys(PROFILES));
export const DEFAULT_PROFILE = 'gfm';

export const getProfile = (id) => PROFILES[id] || PROFILES[DEFAULT_PROFILE];
export const hasPlugin = (profile, plugin) => getProfile(profile && profile.id ? profile.id : profile).plugins.includes(plugin);

// markdown-it constructor options and the built-in rules a profile enables.
export function markdownItOptions(id) {
  const { flags, plugins } = getProfile(id);
  return {
    options: { ...flags },
    enable: [...(plugins.includes('table') ? ['table'] : []), ...(plugins.includes('strikethrough') ? ['strikethrough'] : [])],
    preset: flags.commonmark ? 'commonmark' : 'default',
  };
}
