import { printDoc as _printDoc } from '../../services/publish/print.js';
import { run } from './reply.js';

export const printDoc = (p, event) => run(() => _printDoc(event, p));
