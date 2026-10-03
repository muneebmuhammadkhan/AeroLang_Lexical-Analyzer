"""AeroLang lexical analyzer. Uses only the Python standard library."""

import argparse
import json
import re
import sys


KEYWORDS = {
    'START': 'START', 'END': 'STOP', 'NUM': 'DT', 'CHR': 'DT',
    'GET': 'INPUT', 'PRINT': 'PRINT', 'TEST': 'IF', 'RETEST': 'ELSE_IF',
    'OTHERWISE': 'ELSE', 'CYCLE': 'WHILE',
}
SYMBOLS = {
    '+': ('add', 'Arithmetic'), '-': ('sub', 'Arithmetic'),
    '*': ('mul', 'Arithmetic'), '/': ('divide', 'Arithmetic'),
    '%': ('mod', 'Arithmetic'), '<': ('LT', 'Relational'),
    '>': ('GT', 'Relational'), '<=': ('LE', 'Relational'),
    '>=': ('GE', 'Relational'), '==': ('EQU', 'Relational'),
    '!=': ('NEQU', 'Relational'), '&&': ('AND', 'Logical'),
    '||': ('OR', 'Logical'), '!': ('NOT', 'Logical'),
    '=': ('ASSIGN', 'Assignment'), ':': ('COLON', 'Delimiter'),
    ';': ('SEMICOLON', 'Delimiter'), ',': ('COMMA', 'Delimiter'),
    '(': ('LEFTPAREN', 'Delimiter'), ')': ('RIGHTPAREN', 'Delimiter'),
    '{': ('LEFTBRACE', 'Delimiter'), '}': ('RIGHTBRACE', 'Delimiter'),
}
MAX_IDENTIFIER_LENGTH = 10
WORD = re.compile(r'[A-Za-z0-9_]+')
INTEGER = re.compile(r'[0-9]+')
CHARACTER = re.compile(r"'[A-Za-z]'")


def tokenize(source):
    """Return tokens and errors, with one-based lines/columns and zero-based offsets.

    Signs are separate operators. Quotes belong to literals. No parser or
    semantic checks are performed. Source offsets count Python characters.
    """
    if not isinstance(source, str):
        raise TypeError('Source must be a string')
    tokens, errors = [], []
    offset, line, column = 0, 1, 1

    def advance(end):
        nonlocal offset, line, column
        while offset < end:
            char = source[offset]
            if char == '\r' or (char == '\n' and (offset == 0 or source[offset - 1] != '\r')):
                line += 1
                column = 1
            elif char != '\n':
                column += 1
            offset += 1

    while offset < len(source):
        char = source[offset]
        if char.isspace() or char == '\ufeff':
            advance(offset + 1)
            continue

        # Single-line comment: // ...
        if source.startswith('//', offset):
            n_idx = source.find('\n', offset + 2)
            r_idx = source.find('\r', offset + 2)
            if n_idx != -1 and r_idx != -1:
                end_idx = min(n_idx, r_idx)
            elif n_idx != -1:
                end_idx = n_idx
            else:
                end_idx = r_idx
            if end_idx == -1:
                advance(len(source))
            else:
                advance(end_idx)
            continue

        # Multi-line comment: /* ... */
        if source.startswith('/*', offset):
            start = {'offset': offset, 'line': line, 'column': column}
            closing = source.find('*/', offset + 2)
            if closing == -1:
                advance(len(source))
                lexeme = source[start['offset']:offset]
                errors.append({'message': 'Unterminated multi-line comment', 'lexeme': lexeme, **start})
            else:
                advance(closing + 2)
            continue

        start = {'offset': offset, 'line': line, 'column': column}
        token_type = category = message = None
        match = WORD.match(source, offset)
        if match:
            lexeme = match.group()
            advance(match.end())
            if 'A' <= char <= 'Z' or 'a' <= char <= 'z':
                if lexeme in KEYWORDS:
                    token_type = KEYWORDS[lexeme]
                    category = 'Keyword'
                elif len(lexeme) > MAX_IDENTIFIER_LENGTH:
                    message = f'Identifier exceeds maximum length of {MAX_IDENTIFIER_LENGTH} characters'
                else:
                    token_type = 'ID'
                    category = 'Identifier'
            elif INTEGER.fullmatch(lexeme):
                token_type, category = 'NUM_CONST', 'Integer Constant'
            else:
                message = 'Invalid identifier: start with an ASCII letter, followed by letters, digits, or underscores'
        elif char in ('"', "'"):
            closing = source.find(char, offset + 1)
            if closing == -1:
                advance(len(source))
                kind = 'string' if char == '"' else 'character'
                message = f'Unterminated {kind} literal'
            else:
                advance(closing + 1)
                lexeme = source[start['offset']:offset]
                if char == '"':
                    token_type, category = 'STR_CONST', 'String Constant'
                elif CHARACTER.fullmatch(lexeme):
                    token_type, category = 'CHAR_CONST', 'Character Constant'
                else:
                    message = 'Character literal must contain exactly one ASCII letter'
        else:
            pair = source[offset:offset + 2]
            symbol = pair if pair in SYMBOLS else char
            advance(offset + len(symbol))
            if symbol in SYMBOLS:
                token_type, category = SYMBOLS[symbol]
            else:
                message = f'Unexpected character {json.dumps(char)}'

        lexeme = source[start['offset']:offset]
        if message:
            errors.append({'message': message, 'lexeme': lexeme, **start})
        else:
            tokens.append({'type': token_type, 'lexeme': lexeme, 'category': category, **start})

    return {'tokens': tokens, 'errors': errors}


def main(argv=None):
    parser = argparse.ArgumentParser(description='Tokenize AeroLang source code.')
    parser.add_argument('file', help='Source file, or - for standard input')
    parser.add_argument('--json', action='store_true', help='Print machine-readable JSON')
    args = parser.parse_args(argv)
    try:
        if args.file == '-':
            source = sys.stdin.read()
        else:
            with open(args.file, encoding='utf-8', newline='') as stream:
                source = stream.read()
    except (OSError, UnicodeError) as exc:
        print(f'Cannot read source: {exc}', file=sys.stderr)
        return 2

    result = tokenize(source)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        rows = [('Line', 'Column', 'Token', 'Lexeme', 'Class')]
        rows.extend((str(t['line']), str(t['column']), t['type'],
                     json.dumps(t['lexeme']), t['category']) for t in result['tokens'])
        widths = [max(len(row[i]) for row in rows) for i in range(5)]
        for row in rows:
            print('  '.join(value.ljust(width) for value, width in zip(row, widths)))
        for error in result['errors']:
            print(f"{args.file}:{error['line']}:{error['column']}: "
                  f"{error['message']} ({json.dumps(error['lexeme'])})", file=sys.stderr)
        print(f"{len(result['tokens'])} tokens, {len(result['errors'])} lexical errors")
    return 1 if result['errors'] else 0


if __name__ == '__main__':
    sys.exit(main())
