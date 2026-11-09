import { settingsService } from '../../services/settings/index.js';

export const getAll = () => ({ values: settingsService().getAll() });
export const set = ({ key, value }) => settingsService().set(key, value);
export const reset = (payload) => settingsService().reset(payload?.key);
