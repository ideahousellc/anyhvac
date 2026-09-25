export type DisplayText = {
  text: string | null;
  quotedTextHidden: boolean;
};

const GMAIL_QUOTE = /^On .{3,500}(?:<[^<>\s]+@[^<>\s]+>|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}).*wrote:\s*$/i;
const ORIGINAL_MESSAGE = /^\s*-{2,}\s*(?:Original Message|Forwarded message)\s*-{2,}\s*$/i;
const HEADER_START = /^\s*From:\s*\S.+$/i;
const HEADER_FIELD = /^\s*(?:Sent|Date|To|Cc|Subject):\s*\S.+$/i;

function headerBlockStarts(lines: string[], index: number) {
  if (!HEADER_START.test(lines[index])) return false;
  return lines.slice(index + 1, index + 7).filter((line) => HEADER_FIELD.test(line)).length >= 2;
}

function trailingQuoteStarts(lines: string[], index: number) {
  if (!/^\s*>/.test(lines[index])) return false;
  const remainder = lines.slice(index).filter((line) => line.trim());
  return remainder.length > 0 && remainder.every((line) => /^\s*>/.test(line));
}

export function displayTextBody(raw: string | null): DisplayText {
  if (!raw?.trim()) return { text: null, quotedTextHidden: false };
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const quoteAt = lines.findIndex((line, index) =>
    GMAIL_QUOTE.test(line) || ORIGINAL_MESSAGE.test(line) || headerBlockStarts(lines, index) || trailingQuoteStarts(lines, index));
  if (quoteAt < 0) return { text: raw.trim(), quotedTextHidden: false };
  const visible = lines.slice(0, quoteAt).join("\n").trim();
  return { text: visible || null, quotedTextHidden: true };
}
