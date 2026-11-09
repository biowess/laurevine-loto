import { openReview } from './review-dialog.js';

// Exposes ctx.services.review(plan) to features that propose multi-file changes.
export function register(ctx) {
  ctx.services.review = (plan) => openReview(ctx, plan);
}
