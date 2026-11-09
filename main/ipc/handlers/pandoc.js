import { run } from './reply.js';
import * as pandoc from '../../services/pandoc/index.js';
import { exportDocx as docx } from '../../services/pandoc/docx.js';
import { exportRtf as rtf } from '../../services/pandoc/rtf.js';

export const detect = () => run(() => pandoc.detect({ fresh: true }));
export const test = (p, event) => run(() => pandoc.selfTest(event.sender, p.id));
export const cancel = (p, event) => run(async () => ({ canceled: pandoc.cancel(event.sender, p.id) }));
export const exportDocx = (p, event) => run(() => docx(event, p));
export const exportRtf = (p, event) => run(() => rtf(event, p));
