import { cancelScan, pickSource, startScan } from '../../services/migration/index.js';
import { applyConversion, cancelCopy, pickDest, revertConversion, startCopy } from '../../services/migration/apply.js';
import { run } from './reply.js';

export const pick = (p, event) => run(() => pickSource(event, p && p.kind));

export const scan = (p, event) => run(() => startScan(event.sender, p));

export const cancel = (_p, event) => run(async () => { cancelScan(event.sender.id); cancelCopy(event.sender.id); return {}; });

export const pickDestination = (p, event) => run(() => pickDest(event, p && p.mode));

export const copy = (p, event) => run(() => startCopy(event.sender, p));

export const convert = (p, event) => run(() => applyConversion(event.sender, p));

export const revert = (p, event) => run(() => revertConversion(event.sender, p));
