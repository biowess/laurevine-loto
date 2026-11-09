import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const setNativeTheme = (theme) => invoke(CH.WINDOW_SET_THEME, { theme });
export const toggleMaximize = () => invoke(CH.WINDOW_TOGGLE_MAXIMIZE);
export const minimizeWindow = () => invoke(CH.WINDOW_MINIMIZE);
export const requestClose = () => invoke(CH.WINDOW_REQUEST_CLOSE);
export const isMaximized = () => invoke(CH.WINDOW_IS_MAXIMIZED);
export const setFullScreen = (value) => invoke(CH.WINDOW_SET_FULL_SCREEN, { value });
export const setZoom = (factor) => invoke(CH.WINDOW_SET_ZOOM, { factor });
export const armCloseGuard = () => invoke(CH.WINDOW_ARM_CLOSE_GUARD);
export const closeWindow = () => invoke(CH.WINDOW_CLOSE);
