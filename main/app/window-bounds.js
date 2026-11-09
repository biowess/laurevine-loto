// Pure: no Electron. Decides which bounds a new window gets from the saved state and the current displays.
const int = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);

export function sanitizeState(raw, min) {
  const maximized = raw?.maximized === true;
  const b = raw?.bounds;
  if (!b || typeof b !== 'object') return { bounds: null, maximized };
  const [x, y, width, height] = ['x', 'y', 'width', 'height'].map((k) => int(b[k]));
  const ok = [x, y, width, height].every((v) => v !== null)
    && width >= min.width && height >= min.height && width <= 20000 && height <= 20000;
  return { bounds: ok ? { x, y, width, height } : null, maximized };
}

// The title strip must lie fully inside one work area, with a usable stretch of it horizontally.
export function isVisible(bounds, areas, strip = { width: 120, height: 40 }) {
  return areas.some((a) => {
    const w = Math.min(bounds.x + bounds.width, a.x + a.width) - Math.max(bounds.x, a.x);
    const h = Math.min(bounds.y + strip.height, a.y + a.height) - Math.max(bounds.y, a.y);
    return w >= strip.width && h >= strip.height;
  });
}

// Returns { bounds, maximized }; bounds has no x/y when the window should be centred.
export function pickBounds(raw, areas, defaults, min) {
  const { bounds, maximized } = sanitizeState(raw, min);
  if (bounds && isVisible(bounds, areas)) return { bounds, maximized };
  const area = areas[0] || { width: defaults.width, height: defaults.height };
  return {
    bounds: { width: Math.max(min.width, Math.min(defaults.width, area.width)), height: Math.max(min.height, Math.min(defaults.height, area.height)) },
    maximized,
  };
}
