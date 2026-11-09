import { getAppInfo, getNotices } from '../../services/app-info.js';

export default () => getAppInfo();

export const notices = (payload) => getNotices(payload);
