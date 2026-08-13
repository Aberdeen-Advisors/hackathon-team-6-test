'use client';

/**
 * Real .docx ingestion, client-side.
 *
 * mammoth converts the uploaded file to semantic HTML, which preserves headings and list
 * structure — so a document's own sections survive into the synthesis rather than being
 * flattened into a text blob (PRD section 11.1).
 *
 * Other formats are deliberately NOT offered in the interface. A control that does not
 * work is worse than an absent one.
 */

import type { DocStructure, DocParagraph } from './synthesise';

export const SUPPORTED_EXTENSIONS = ['.docx'] as const;

export const FUTURE_FORMATS = [
  { ext: '.pptx', label: 'PowerPoint', note: 'Slide, shape, table and speaker-note extraction' },
  { ext: '.xlsx', label: 'Excel', note: 'Sheets, formulas and detected tables, header rows preserved' },
  { ext: '.pdf',  label: 'PDF',      note: 'Page text with character offsets for anchoring' },
] as const;

export async function parseDocx(file: File): Promise<DocStructure> {
  const mammoth = (await import('mammoth/mammoth.browser')) as unknown as {
    convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
  };

  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  const dom = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = dom.getElementById('root');
  if (!root) throw new Error('Could not read the document contents.');

  const paragraphs: DocParagraph[] = [];
  let section = 'Introduction';
  let index = 0;

  const walk = (el: Element) => {
    for (const node of Array.from(el.children)) {
      const tag = node.tagName.toLowerCase();
      const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();

      if (tag === 'ul' || tag === 'ol') { walk(node); continue; }
      if (!text) continue;

      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        section = text;
        paragraphs.push({ index: index++, text, style: tag as 'h1' | 'h2' | 'h3', section });
      } else if (tag === 'li') {
        paragraphs.push({ index: index++, text, style: 'li', section });
      } else if (tag === 'p' || tag === 'div' || tag === 'table') {
        paragraphs.push({ index: index++, text, style: 'p', section });
      }
    }
  };
  walk(root);

  if (paragraphs.length === 0) {
    throw new Error('This document appears to contain no readable text.');
  }

  const wordCount = paragraphs.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
  const sections = [...new Set(paragraphs.map((p) => p.section))];

  return { filename: file.name, paragraphs, sections, wordCount };
}
