"""Run with: python -m unittest -v"""
import json
from pathlib import Path
import subprocess
import sys
import unittest

from aerolang_lexer import tokenize

ROOT = Path(__file__).resolve().parent


def types(source):
    return [token['type'] for token in tokenize(source)['tokens']]


class LexerTests(unittest.TestCase):
    def test_keywords(self):
        self.assertEqual(types('START END NUM CHR GET PRINT TEST RETEST OTHERWISE CYCLE'),
                         ['START', 'STOP', 'DT', 'DT', 'INPUT', 'PRINT', 'IF', 'ELSE_IF', 'ELSE', 'WHILE'])

    def test_identifiers(self):
        self.assertEqual(types('start STARTED age student1 total_mark A1'), ['ID'] * 6)

    def test_identifier_length(self):
        # Exactly 10 characters: valid identifier
        self.assertEqual(types('abcdefghij A123456789 _123456789'[11:]), ['ID'])
        self.assertEqual(len('total_mark'), 10)
        self.assertEqual(types('total_mark'), ['ID'])

        # Exceeding 10 characters (11 characters): lexical error
        result = tokenize('total_marks')
        self.assertEqual(len(result['errors']), 1)
        self.assertIn('Identifier exceeds maximum length of 10 characters', result['errors'][0]['message'])
        self.assertEqual(result['errors'][0]['lexeme'], 'total_marks')
        self.assertEqual(result['tokens'], [])

    def test_comments(self):
        code = """
        // Single-line comment before start
        START // Comment at end of line
        /* Multi-line comment
           spanning lines */
        NUM : age = 10; /* inline multi-line */
        CYCLE(age > 0) {
            // inside loop
            age = age - 1;
        }
        END // End comment
        """
        result = tokenize(code)
        self.assertFalse(result['errors'])
        expected_types = [
            'START', 'DT', 'COLON', 'ID', 'ASSIGN', 'NUM_CONST', 'SEMICOLON',
            'WHILE', 'LEFTPAREN', 'ID', 'GT', 'NUM_CONST', 'RIGHTPAREN',
            'LEFTBRACE', 'ID', 'ASSIGN', 'ID', 'sub', 'NUM_CONST', 'SEMICOLON',
            'RIGHTBRACE', 'STOP'
        ]
        self.assertEqual([t['type'] for t in result['tokens']], expected_types)

    def test_unterminated_comment(self):
        result = tokenize('START /* unclosed multi-line comment')
        self.assertEqual(len(result['errors']), 1)
        self.assertIn('Unterminated multi-line comment', result['errors'][0]['message'])
        self.assertEqual(result['errors'][0]['line'], 1)
        self.assertEqual(result['errors'][0]['column'], 7)

    def test_declaration(self):
        self.assertEqual(types("NUM : age = 25; CHR : grade = 'A'; PRINT(\"Hello\");"),
                         ['DT', 'COLON', 'ID', 'ASSIGN', 'NUM_CONST', 'SEMICOLON',
                          'DT', 'COLON', 'ID', 'ASSIGN', 'CHAR_CONST', 'SEMICOLON',
                          'PRINT', 'LEFTPAREN', 'STR_CONST', 'RIGHTPAREN', 'SEMICOLON'])

    def test_operators(self):
        self.assertEqual(types('+ - * / % < > <= >= == != && || ! = : ; , ( ) { }'),
                         ['add', 'sub', 'mul', 'divide', 'mod', 'LT', 'GT', 'LE', 'GE',
                          'EQU', 'NEQU', 'AND', 'OR', 'NOT', 'ASSIGN', 'COLON',
                          'SEMICOLON', 'COMMA', 'LEFTPAREN', 'RIGHTPAREN', 'LEFTBRACE', 'RIGHTBRACE'])
        self.assertEqual(types('a-1<=+2'), ['ID', 'sub', 'NUM_CONST', 'LE', 'add', 'NUM_CONST'])

    def test_invalid_input_and_recovery(self):
        result = tokenize("1age _name @ & | 'AB' '1' ''; END")
        self.assertEqual(len(result['errors']), 8)
        self.assertEqual([t['type'] for t in result['tokens']], ['SEMICOLON', 'STOP'])
        self.assertEqual(len(tokenize('1.2')['errors']), 1)

    def test_unterminated_literals(self):
        for source in ['  "hello', "  'A"]:
            with self.subTest(source=source):
                errors = tokenize(source)['errors']
                self.assertEqual(len(errors), 1)
                self.assertIn('Unterminated', errors[0]['message'])
                self.assertEqual(errors[0]['column'], 3)

    def test_string_rules(self):
        result = tokenize('"" "a\nb" "\\n"')
        self.assertFalse(result['errors'])
        self.assertEqual([t['lexeme'] for t in result['tokens']], ['""', '"a\nb"', '"\\n"'])

    def test_positions(self):
        result = tokenize('START\r\n\tNUM\rCHR\nEND')
        self.assertEqual([(t['line'], t['column'], t['offset']) for t in result['tokens']],
                         [(1, 1, 0), (2, 2, 8), (3, 1, 12), (4, 1, 16)])
        self.assertEqual(tokenize('\nEND')['tokens'][0]['line'], 2)

    def test_empty_and_sample(self):
        self.assertEqual(tokenize(' \n\t'), {'tokens': [], 'errors': []})
        result = tokenize((ROOT / 'examples/demo.aero').read_text(encoding='utf-8'))
        self.assertFalse(result['errors'])
        self.assertEqual(result['tokens'][0]['type'], 'START')
        self.assertEqual(result['tokens'][-1]['type'], 'STOP')

    def test_cli(self):
        for source, code in [('START END', 0), ('@', 1)]:
            result = subprocess.run([sys.executable, str(ROOT / 'aerolang_lexer.py'), '-', '--json'],
                                    input=source, capture_output=True, text=True)
            self.assertEqual(result.returncode, code)
            self.assertEqual(bool(json.loads(result.stdout)['errors']), bool(code))
        result = subprocess.run([sys.executable, str(ROOT / 'aerolang_lexer.py')], capture_output=True)
        self.assertEqual(result.returncode, 2)


if __name__ == '__main__':
    unittest.main()
