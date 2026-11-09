import { fileURLToPath } from 'node:url';

const dir = (relative) => fileURLToPath(new URL(relative, import.meta.url));

export const RENDERER_DIR = dir('../../renderer/');
export const SHARED_DIR = dir('../../shared/');
export const PRELOAD_PATH = dir('../preload.cjs');
