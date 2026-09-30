export interface Token {
  type: string;
  lexeme: string;
  category: string;
  offset: number;
  line: number;
  column: number;
}

export interface LexicalError {
  message: string;
  lexeme: string;
  offset: number;
  line: number;
  column: number;
}

export interface LexerResult {
  tokens: Token[];
  errors: LexicalError[];
  executionTimeMs: number;
}

export const KEYWORDS: Record<string, string> = {
  START: 'START',
  END: 'STOP',
  NUM: 'DT',
  CHR: 'DT',
  GET: 'INPUT',
  PRINT: 'PRINT',
  TEST: 'IF',
  RETEST: 'ELSE_IF',
  OTHERWISE: 'ELSE',
  CYCLE: 'WHILE',
};

export const SYMBOLS: Record<string, [string, string]> = {
  '+': ['add', 'Arithmetic'],
  '-': ['sub', 'Arithmetic'],
  '*': ['mul', 'Arithmetic'],
  '/': ['divide', 'Arithmetic'],
  '%': ['mod', 'Arithmetic'],
  '<': ['LT', 'Relational'],
  '>': ['GT', 'Relational'],
  '<=': ['LE', 'Relational'],
  '>=': ['GE', 'Relational'],
  '==': ['EQU', 'Relational'],
  '!=': ['NEQU', 'Relational'],
  '&&': ['AND', 'Logical'],
  '||': ['OR', 'Logical'],
  '!': ['NOT', 'Logical'],
  '=': ['ASSIGN', 'Assignment'],
  ':': ['COLON', 'Delimiter'],
  ';': ['SEMICOLON', 'Delimiter'],
  ',': ['COMMA', 'Delimiter'],
  '(': ['LEFTPAREN', 'Delimiter'],
  ')': ['RIGHTPAREN', 'Delimiter'],
  '{': ['LEFTBRACE', 'Delimiter'],
  '}': ['RIGHTBRACE', 'Delimiter'],
};

const WORD_REGEX = /^[A-Za-z0-9_]+/;
const INTEGER_REGEX = /^[0-9]+$/;
const CHARACTER_REGEX = /^'[A-Za-z]'$/;

export function tokenize(source: string): LexerResult {
  const startTime = performance.now();
  if (typeof source !== 'string') {
    throw new TypeError('Source must be a string');
  }

  const tokens: Token[] = [];
  const errors: LexicalError[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  function advance(end: number) {
    while (offset < end) {
      const char = source[offset];
      if (char === '\r' || (char === '\n' && (offset === 0 || source[offset - 1] !== '\r'))) {
        line += 1;
        column = 1;
      } else if (char !== '\n') {
        column += 1;
      }
      offset += 1;
    }
  }

  while (offset < source.length) {
    const char = source[offset];

    // whitespace or BOM check
    if (/\s/.test(char) || char === '\ufeff') {
      advance(offset + 1);
      continue;
    }

    const start = { offset, line, column };
    let tokenType: string | null = null;
    let category: string | null = null;
    let message: string | null = null;

    const remaining = source.slice(offset);
    const wordMatch = remaining.match(WORD_REGEX);

    if (wordMatch) {
      const lexeme = wordMatch[0];
      advance(offset + lexeme.length);

      if ((char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z')) {
        tokenType = KEYWORDS[lexeme] || 'ID';
        category = KEYWORDS[lexeme] ? 'Keyword' : 'Identifier';
      } else if (INTEGER_REGEX.test(lexeme)) {
        tokenType = 'NUM_CONST';
        category = 'Integer Constant';
      } else {
        message = 'Invalid identifier: start with an ASCII letter, followed by letters, digits, or underscores';
      }
    } else if (char === '"' || char === "'") {
      const closing = source.indexOf(char, offset + 1);
      if (closing === -1) {
        advance(source.length);
        const kind = char === '"' ? 'string' : 'character';
        message = `Unterminated ${kind} literal`;
      } else {
        advance(closing + 1);
        const lexeme = source.slice(start.offset, offset);
        if (char === '"') {
          tokenType = 'STR_CONST';
          category = 'String Constant';
        } else if (CHARACTER_REGEX.test(lexeme)) {
          tokenType = 'CHAR_CONST';
          category = 'Character Constant';
        } else {
          message = 'Character literal must contain exactly one ASCII letter';
        }
      }
    } else {
      const pair = source.slice(offset, offset + 2);
      const symbol = pair in SYMBOLS ? pair : char;
      advance(offset + symbol.length);

      if (symbol in SYMBOLS) {
        [tokenType, category] = SYMBOLS[symbol];
      } else {
        message = `Unexpected character ${JSON.stringify(char)}`;
      }
    }

    const lexeme = source.slice(start.offset, offset);
    if (message) {
      errors.push({ message, lexeme, ...start });
    } else if (tokenType && category) {
      tokens.push({ type: tokenType, lexeme, category, ...start });
    }
  }

  const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
  return { tokens, errors, executionTimeMs };
}

export function formatCliOutput(result: LexerResult, filename = 'program.aero'): string {
  const rows: [string, string, string, string, string][] = [
    ['Line', 'Column', 'Token', 'Lexeme', 'Class'],
  ];

  for (const t of result.tokens) {
    rows.push([
      String(t.line),
      String(t.column),
      t.type,
      JSON.stringify(t.lexeme),
      t.category,
    ]);
  }

  const widths = [0, 1, 2, 3, 4].map((colIdx) =>
    Math.max(...rows.map((row) => row[colIdx].length))
  );

  const lines = rows.map((row) =>
    row.map((val, idx) => val.padEnd(widths[idx])).join('  ')
  );

  const errorLines = result.errors.map(
    (e) => `${filename}:${e.line}:${e.column}: ${e.message} (${JSON.stringify(e.lexeme)})`
  );

  const summary = `${result.tokens.length} tokens, ${result.errors.length} lexical errors`;

  let output = lines.join('\n');
  if (errorLines.length > 0) {
    output += '\n\n' + errorLines.join('\n');
  }
  output += '\n\n' + summary;

  return output;
}
