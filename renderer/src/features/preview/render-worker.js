import { render } from '../../core/markdown/renderer.js';

self.onmessage = (e) => {
  const { id, text, opts } = e.data;
  try {
    const res = render(text, opts);
    self.postMessage({ id, ok: true, res });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
