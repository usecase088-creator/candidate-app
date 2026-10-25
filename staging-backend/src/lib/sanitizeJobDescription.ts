import sanitizeHtml from 'sanitize-html';

/** Mirror recruiter/src/lib/sanitizeHtml.ts — text formatting tags only, no attributes. */
export function sanitizeJobDescriptionHtml(html: string): string {
  if (!html?.trim()) return '';
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'div'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });
}
