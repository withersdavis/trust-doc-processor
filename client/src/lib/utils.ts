import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Text formatting utilities
export interface FormattedTextElement {
  type: 'text' | 'bullet' | 'number' | 'paragraph' | 'header' | 'bold' | 'italic';
  content: string;
  level?: number; // for headers and nested lists
}

export function parseFormattedText(text: string): FormattedTextElement[] {
  if (!text || typeof text !== 'string') {
    return [{ type: 'text', content: String(text || '') }];
  }

  const elements: FormattedTextElement[] = [];
  const lines = text.split('\n').filter(line => line.trim());

  let currentElement: FormattedTextElement | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      if (currentElement && currentElement.type === 'paragraph') {
        elements.push(currentElement);
        currentElement = null;
      }
      continue;
    }

    // Check for headers (lines that are all caps or start with specific patterns)
    if (isHeader(line)) {
      if (currentElement) {
        elements.push(currentElement);
        currentElement = null;
      }
      elements.push({
        type: 'header',
        content: line.replace(/^[#\s]+/, '').trim(),
        level: getHeaderLevel(line)
      });
      continue;
    }

    // Check for bullet points at start of line
    if (/^[•\-*]\s/.test(line)) {
      if (currentElement && currentElement.type === 'paragraph') {
        elements.push(currentElement);
        currentElement = null;
      }
      elements.push({
        type: 'bullet',
        content: line.replace(/^[•\-*]\s/, '').trim()
      });
      continue;
    }

    // Check for numbered lists at start of line
    if (/^\d+\.\s/.test(line)) {
      if (currentElement && currentElement.type === 'paragraph') {
        elements.push(currentElement);
        currentElement = null;
      }
      elements.push({
        type: 'number',
        content: line.replace(/^\d+\.\s/, '').trim()
      });
      continue;
    }

    // Check for inline bullet lists (bullet points within a line)
    if (line.includes('•') && line.split('•').length > 1) {
      if (currentElement && currentElement.type === 'paragraph') {
        elements.push(currentElement);
        currentElement = null;
      }

      // Split the line by bullet points and process each part
      const parts = line.split(/(?=•)/);
      let hasProcessedFirst = false;

      for (const part of parts) {
        const trimmedPart = part.trim();
        if (!trimmedPart) continue;

        if (trimmedPart.startsWith('•')) {
          // This is a bullet point
          elements.push({
            type: 'bullet',
            content: trimmedPart.replace(/^•\s*/, '').trim()
          });
        } else if (trimmedPart && !hasProcessedFirst) {
          // This is the text before the first bullet point
          elements.push({
            type: 'paragraph',
            content: trimmedPart
          });
          hasProcessedFirst = true;
        }
      }
      continue;
    }

    // Check for bold text (surrounded by ** or __)
    if (/\*\*.*\*\*|__.*__/.test(line)) {
      if (currentElement && currentElement.type === 'paragraph') {
        elements.push(currentElement);
        currentElement = null;
      }
      elements.push({
        type: 'bold',
        content: line.replace(/\*\*|__/g, '').trim()
      });
      continue;
    }

    // Check for italic text (surrounded by * or _)
    if (/\*.*\*|_.*_/.test(line)) {
      if (currentElement && currentElement.type === 'paragraph') {
        elements.push(currentElement);
        currentElement = null;
      }
      elements.push({
        type: 'italic',
        content: line.replace(/\*|_/g, '').trim()
      });
      continue;
    }

    // Regular paragraph text
    if (currentElement && currentElement.type === 'paragraph') {
      currentElement.content += ' ' + line;
    } else {
      currentElement = {
        type: 'paragraph',
        content: line
      };
    }
  }

  // Add the last element if it exists
  if (currentElement) {
    elements.push(currentElement);
  }

  return elements.length > 0 ? elements : [{ type: 'text', content: text }];
}

function isHeader(line: string): boolean {
  // Check for markdown-style headers
  if (/^#{1,6}\s/.test(line)) return true;

  // Check for all caps lines that are likely headers
  if (line.length > 3 && line.length < 100 && /^[A-Z\s]+$/.test(line)) return true;

  // Check for lines ending with colon (common in legal documents)
  if (line.endsWith(':') && line.length > 5 && line.length < 80) return true;

  return false;
}

function getHeaderLevel(line: string): number {
  // Markdown-style headers
  const match = line.match(/^(#{1,6})/);
  if (match) return match[1].length;

  // All caps headers are usually level 2
  if (/^[A-Z\s]+$/.test(line)) return 2;

  // Lines ending with colon are usually level 3
  if (line.endsWith(':')) return 3;

  return 2;
}

export function formatTextForDisplay(text: string): string {
  if (!text || typeof text !== 'string') {
    return String(text || '');
  }

  // Clean up common formatting issues
  return text
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Document formatting utilities for original document display
export interface DocumentSection {
  type: 'header' | 'paragraph' | 'list' | 'text';
  content: string;
  startPos: number;
  endPos: number;
  level?: number;
}

export function parseDocumentStructure(text: string): DocumentSection[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const sections: DocumentSection[] = [];
  const lines = text.split('\n');
  let currentPos = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = currentPos;
    const lineEnd = currentPos + line.length;

    // Skip empty lines but track position
    if (!line.trim()) {
      currentPos += line.length + 1; // +1 for newline
      continue;
    }

    // Check for headers (all caps, ending with colon, or markdown style)
    if (isDocumentHeader(line)) {
      sections.push({
        type: 'header',
        content: line.trim(),
        startPos: lineStart,
        endPos: lineEnd,
        level: getDocumentHeaderLevel(line)
      });
    }
    // Check for list items
    else if (/^[\s]*[•\-*]\s/.test(line) || /^[\s]*\d+\.\s/.test(line)) {
      sections.push({
        type: 'list',
        content: line.trim(),
        startPos: lineStart,
        endPos: lineEnd
      });
    }
    // Regular paragraphs
    else {
      sections.push({
        type: 'paragraph',
        content: line.trim(),
        startPos: lineStart,
        endPos: lineEnd
      });
    }

    currentPos += line.length + 1; // +1 for newline
  }

  return sections;
}

function isDocumentHeader(line: string): boolean {
  const trimmed = line.trim();

  // Markdown-style headers
  if (/^#{1,6}\s/.test(trimmed)) return true;

  // All caps lines (common in legal documents)
  if (trimmed.length > 3 && trimmed.length < 100 && /^[A-Z\s]+$/.test(trimmed)) return true;

  // Lines ending with colon (common in legal documents)
  if (trimmed.endsWith(':') && trimmed.length > 5 && trimmed.length < 80) return true;

  // Lines that are likely section headers
  if (trimmed.length > 5 && trimmed.length < 60 &&
    (trimmed.includes('TRUST') || trimmed.includes('ARTICLE') ||
      trimmed.includes('SECTION') || trimmed.includes('PROVISION'))) return true;

  return false;
}

function getDocumentHeaderLevel(line: string): number {
  const trimmed = line.trim();

  // Markdown-style headers
  const match = trimmed.match(/^(#{1,6})/);
  if (match) return match[1].length;

  // All caps headers are usually level 1
  if (/^[A-Z\s]+$/.test(trimmed)) return 1;

  // Lines ending with colon are usually level 2
  if (trimmed.endsWith(':')) return 2;

  // Other headers are level 3
  return 3;
}

export function formatDocumentForDisplay(text: string, citations: any[] = []): string {
  const sections = parseDocumentStructure(text);
  let formattedHtml = '';
  let currentPos = 0;

  for (const section of sections) {
    // Add any text between sections
    if (currentPos < section.startPos) {
      const betweenText = text.substring(currentPos, section.startPos);
      if (betweenText.trim()) {
        formattedHtml += `<p class="mb-2">${escapeHtml(betweenText)}</p>`;
      }
    }

    // Format the section
    const sectionHtml = formatDocumentSection(section);
    formattedHtml += sectionHtml;

    currentPos = section.endPos;
  }

  // Add any remaining text
  if (currentPos < text.length) {
    const remainingText = text.substring(currentPos);
    if (remainingText.trim()) {
      formattedHtml += `<p class="mb-2">${escapeHtml(remainingText)}</p>`;
    }
  }

  return formattedHtml;
}

function formatDocumentSection(section: DocumentSection): string {
  const { type, content, level = 1 } = section;
  const escapedContent = escapeHtml(content);

  switch (type) {
    case 'header':
      const headerClasses = {
        1: 'text-lg font-bold text-gray-900 mb-4 mt-6 border-b border-gray-300 pb-2',
        2: 'text-base font-semibold text-gray-800 mb-3 mt-4',
        3: 'text-sm font-semibold text-gray-700 mb-2 mt-3'
      };
      const headerClass = headerClasses[level as keyof typeof headerClasses] || headerClasses[3];

      if (level === 1) {
        return `<h1 class="${headerClass}">${escapedContent}</h1>`;
      } else if (level === 2) {
        return `<h2 class="${headerClass}">${escapedContent}</h2>`;
      } else {
        return `<h3 class="${headerClass}">${escapedContent}</h3>`;
      }

    case 'list':
      const isNumbered = /^\d+\.\s/.test(content);
      const listItem = content.replace(/^[\s]*[•\-*]\s|^\d+\.\s/, '');
      const listClass = isNumbered ? 'list-decimal list-inside ml-4' : 'list-disc list-inside ml-4';
      return `<li class="${listClass} mb-1">${escapeHtml(listItem)}</li>`;

    case 'paragraph':
      return `<p class="mb-3 leading-relaxed text-gray-800">${escapedContent}</p>`;

    default:
      return `<p class="mb-2">${escapedContent}</p>`;
  }
}

function escapeHtml(text: string): string {
  // First, protect highlight markers from being escaped
  const protectedText = text
    .replace(/<!--HIGHLIGHT_START-->/g, '___HIGHLIGHT_START___')
    .replace(/<!--HIGHLIGHT_END-->/g, '___HIGHLIGHT_END___');

  // Escape HTML
  const escaped = protectedText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Restore highlight markers
  return escaped
    .replace(/___HIGHLIGHT_START___/g, '<!--HIGHLIGHT_START-->')
    .replace(/___HIGHLIGHT_END___/g, '<!--HIGHLIGHT_END-->');
}