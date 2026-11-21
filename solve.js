// Fast drop-in replacement for csv-reader 1.0.0's readCsv: identical answers, faster reading.
// Strategy: scan char codes in one pass; slice substrings for whole fields (no per-char concat);
// a slow path handles only the fields that actually contain broken sequences (stray CR, junk).
const CR = 13, LF = 10, COMMA = 44, QUOTE = 34;
const LINE_BREAK = 'line break';
const END = 'end';

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const n = text.length;
  let pos = 0;
  let line = 1;
  if (text.charCodeAt(0) === 0xfeff) pos = 1;

  let recordLine = 1;
  let recordRow = null;

  // Reads unquoted characters up to the next comma or line break.
  // Fast path: the span holds no CR at all -> one substring + one line count.
  // Slow path: per-character handling (stray CR dropped, error recorded).
  function readUnquoted(value, valueCodes) {
    let added = 0;
    // try fast path
    let i = pos;
    let crAt = -1;
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === COMMA || c === LF || c === CR) {
        if (c === CR) { crAt = i; break; }
        break;
      }
      i += 1;
    }
    if (i >= n || text.charCodeAt(i) !== CR) {
      // span [pos, i) has no CR; ends at comma/LF or end
      const seg = text.slice(pos, i);
      if (seg.length > 0) { value += seg; added += seg.length; }
      if (i >= n) { pos = n; return { value, ended: END, added }; }
      if (text.charCodeAt(i) === COMMA) { pos = i + 1; return { value, ended: COMMA, added }; }
      pos = i + 1; line += 1; return { value, ended: LINE_BREAK, added };
    }
    // slow path from pos, per character
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === COMMA) { pos += 1; return { value, ended: COMMA, added }; }
      if (c === LF) { pos += 1; line += 1; return { value, ended: LINE_BREAK, added }; }
      if (c === CR) {
        if (pos + 1 < n && text.charCodeAt(pos + 1) === LF) { pos += 2; line += 1; return { value, ended: LINE_BREAK, added }; }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        pos += 1;
        continue;
      }
      value += text[pos];
      added += 1;
      pos += 1;
    }
    return { value, ended: END, added };
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = '';
    pos += 1;
    // fast inner scan: find the closing quote, handling doubled quotes
    let segStart = pos;
    let closed = false;
    while (pos < n) {
      const q = text.indexOf('"', pos);
      if (q === -1) { pos = n; break; }
      if (q + 1 < n && text.charCodeAt(q + 1) === QUOTE) { pos = q + 2; continue; }
      pos = q + 1;
      closed = true;
      break;
    }
    const segEnd = closed ? pos - 1 : pos; // quote body ends before the closing quote (or text end)
    if (segEnd > segStart) {
      const body = text.slice(segStart, segEnd);
      // CR and CRLF inside quotes are each one LF; a doubled quote is one literal quote.
      let proc = body;
      if (proc.indexOf('\r') !== -1) proc = proc.replace(/\r\n?/g, '\n');
      if (proc.indexOf('""') !== -1) proc = proc.replace(/""/g, '"');
      value += proc;
      // every LF, and every lone CR (CRLF counts once), inside the body is one line
      for (let i = segStart; i < segEnd; i += 1) {
        const c = text.charCodeAt(i);
        if (c === LF) line += 1;
        else if (c === CR && text.charCodeAt(i + 1) !== LF) line += 1;
      }
    }
    if (!closed) {
      // The quote never closes: literal character, rest re-read as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      return readUnquoted('"');
    }
    if (pos >= n) return { value, ended: END };
    const c = text.charCodeAt(pos);
    if (c === COMMA) { pos += 1; return { value, ended: COMMA }; }
    if (c === LF) { pos += 1; line += 1; return { value, ended: LINE_BREAK }; }
    if (c === CR && pos + 1 < n && text.charCodeAt(pos + 1) === LF) { pos += 2; line += 1; return { value, ended: LINE_BREAK }; }
    // junk after the closing quote, appended as it stands
    const junk = readUnquoted(value);
    if (junk.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    return junk;
  }

  while (true) {
    // blank lines are no records
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === LF) { pos += 1; line += 1; }
      else if (c === CR && pos + 1 < n && text.charCodeAt(pos + 1) === LF) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === QUOTE;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);

    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
