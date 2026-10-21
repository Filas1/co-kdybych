/**
 * Parses one CSV line. Handles quoted fields with commas inside ("Bydlení, voda, …")
 * and escaped quotes (""). Good enough for the government CSVs we read; not a full RFC 4180 parser
 * (no newlines inside quoted fields).
 */
export function parseCsvLine(line: string, delimiter = ","): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

/** Splits text into non-empty lines, accepting both LF and CRLF line endings. */
export function splitLines(text: string): string[] {
  return text.split(/\r?\n/).filter((line) => line.trim() !== "");
}
