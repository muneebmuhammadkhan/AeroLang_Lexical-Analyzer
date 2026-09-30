# AeroLang Lexical Analyzer (Python)

Yeh project `AeroLang_Language_Specification_Full.docx` ke mutabiq AeroLang source code ko **tokens** mein divide karta hai. Misal: `NUM : age = 25;` mein `NUM` keyword, `age` identifier aur `25` integer literal hai.

## Project files

| File | Kaam |
| --- | --- |
| `aerolang_lexer.py` | Python analyzer aur command-line interface |
| `examples/demo.aero` | Sample AeroLang program |
| `test_lexer.py` | Automated tests |
| `AeroLang_Language_Specification_Full.docx` | Original specification |
| `README.md` | Explanation aur run instructions |

## Requirements

Python **3.8 ya newer** chahiye. Koi external library ya `pip install` ki zaroorat nahi.

## VS Code mein run kaise karein

1. Project folder VS Code mein open karein.
2. **Terminal > New Terminal** select karein.
3. Terminal project folder mein hona chahiye:

   ```powershell
   cd "C:\Users\muham\Desktop\New folder"
   ```

4. Python check karein aur sample run karein:

   ```powershell
   python --version
   python aerolang_lexer.py examples/demo.aero
   ```

### Agar python command nahi chalti

Windows Python launcher available ho to:

```powershell
py aerolang_lexer.py examples/demo.aero
```

Is computer par installed Python ke full path se bhi run kar sakte hain:

```powershell
& "C:\Users\muham\AppData\Local\Python\pythoncore-3.14-64\python.exe" aerolang_lexer.py examples/demo.aero
```

Yeh full path is computer ke liye hai. Doosre computer par apne Python installation ka path use karein. Python installed na ho to Python 3 install karein, PATH option enable karein aur terminal dobara kholein.

## Apna program analyze karein

Project folder mein `my_program.aero` file banayein:

```text
START
NUM : age = 20;
CHR : grade = 'A';
GET(age);
PRINT("Welcome");
TEST(age >= 18) {
    PRINT(grade);
}
END
```

Run:

```powershell
python aerolang_lexer.py my_program.aero
```

Yeh program ko tokenize karta hai. `GET` se input lena, `PRINT` execute karna ya loop chalana is analyzer ka kaam nahi hai.

## Output ka matlab

Input `NUM : age = 25;` ka output:

```text
Line  Column  Token      Lexeme  Class
1     1       DT         "NUM"   Keyword
1     5       COLON      ":"     Delimiter
1     7       ID         "age"   Identifier
1     11      ASSIGN     "="     Assignment
1     13      NUM_CONST  "25"    Integer Constant
1     15      SEMICOLON  ";"     Delimiter
6 tokens, 0 lexical errors
```

- **Line / Column:** Token ki starting position; counting 1 se hoti hai.
- **Token:** Specification mein diya gaya token name.
- **Lexeme:** Original source text, output mein JSON quotes ke saath dikhaya jata hai.
- **Class:** Token ki category, jaise Keyword ya Identifier.

## Supported tokens

### Keywords (case sensitive)

| Keyword | Token |
| --- | --- |
| `START` | `START` |
| `END` | `STOP` |
| `NUM`, `CHR` | `DT` |
| `GET` | `INPUT` |
| `PRINT` | `PRINT` |
| `TEST` | `IF` |
| `RETEST` | `ELSE_IF` |
| `OTHERWISE` | `ELSE` |
| `CYCLE` | `WHILE` |

`START` keyword hai; `start` aur `STARTED` identifiers hain.

### Identifiers aur literals

| Type | Rule | Example | Token |
| --- | --- | --- | --- |
| Identifier | `[A-Za-z][A-Za-z0-9_]*` | `age`, `student1`, `total_marks` | `ID` |
| Integer | `[0-9]+` | `25`, `100` | `NUM_CONST` |
| Character | Single quotes mein exactly aik ASCII letter | `'A'`, `'z'` | `CHAR_CONST` |
| String | Double quotes ke andar text | `"Hello"`, `""` | `STR_CONST` |

### Operators aur delimiters

| Lexemes | Tokens (usi order mein) |
| --- | --- |
| `+`, `-`, `*`, `/`, `%` | `add`, `sub`, `mul`, `divide`, `mod` |
| `<`, `>`, `<=`, `>=`, `==`, `!=` | `LT`, `GT`, `LE`, `GE`, `EQU`, `NEQU` |
| `&&`, `\|\|`, `!` | `AND`, `OR`, `NOT` |
| `=` | `ASSIGN` |
| `:`, `;`, `,` | `COLON`, `SEMICOLON`, `COMMA` |
| `(`, `)` | `LEFTPAREN`, `RIGHTPAREN` |
| `{`, `}` | `LEFTBRACE`, `RIGHTBRACE` |

## Analyzer kaise kaam karta hai

1. File UTF-8 text ke taur par read hoti hai.
2. `tokenize(source)` text ko left se right scan karta hai.
3. Whitespace skip hoti hai; line aur column update hote hain.
4. Words ko keyword, identifier ya integer classify kiya jata hai.
5. Quotes se shuru hone wale text ko literal ke taur par check kiya jata hai.
6. Two-character operators pehle match hote hain, taake `>=` aik token bane.
7. Valid tokens aur lexical errors alag lists mein save hote hain.
8. Result table ya JSON mein print hota hai.

## Lexical errors

| Invalid input | Wajah |
| --- | --- |
| `1age`, `_name` | Identifier ASCII letter se start nahi hua |
| `@`, `&`, `\|` | Unsupported character/operator |
| `'AB'`, `'1'`, `''` | Exactly aik ASCII letter nahi hai |
| `"Hello` | Closing quote missing hai |
| `25.5` | Decimal point supported nahi hai |

Error ke saath file, line aur column show hote hain. Recoverable errors ke baad scanning continue hoti hai. Unterminated literal end of input tak consume hota hai.

## JSON output, stdin aur help

```powershell
python aerolang_lexer.py examples/demo.aero --json
python aerolang_lexer.py examples/demo.aero --json > tokens.json
'NUM : age = 25;' | python aerolang_lexer.py -
python aerolang_lexer.py --help
```

JSON mein `tokens` aur `errors` arrays hoti hain. Har entry mein zero-based `offset` bhi hota hai jo Python characters count karta hai.

Exit code `0` success, `1` lexical errors aur `2` command/file-read error ke liye hai.

## Python code se use karein

```python
from aerolang_lexer import tokenize

result = tokenize("NUM : age = 25;")
for token in result["tokens"]:
    print(token["type"], token["lexeme"], token["line"], token["column"])

for error in result["errors"]:
    print(error["message"])
```

## Tests run karein

```powershell
python -m unittest -v
```

10 tests keywords, identifiers, declarations, operators, errors, strings, positions, sample aur CLI verify karte hain. `python` unavailable ho to upar diya gaya `py` ya full Python path use karein.

## Specification decisions aur limitations

- Signed numbers mein sign separate operator hai: `-25` se `sub` aur `NUM_CONST` bante hain. Unary signs parser handle karega.
- Document ke `[+/-]` pattern mein slash ko typo maana gaya hai; `/` division hai.
- Quotes literal ka hissa hain. Document mein listed `SIN_QUOTE` aur `DUAL_QUOTE` separately emit nahi hote; complete `CHAR_CONST` aur `STR_CONST` tokens bante hain.
- Strings document ke `"[^"]*"` rule ko follow karti hain; empty aur multiline strings allowed hain. Escape sequences defined nahi; backslash ordinary character hai.
- Comments aur floating-point numbers defined nahi. Comment jaisa text ordinary operators aur identifiers mein tokenize hota hai.
- Tabs aik column aur CRLF aik newline count hota hai. Synthetic EOF token add nahi hota.
- Yeh lexer hai, parser ya interpreter nahi. Missing semicolons, unmatched braces, undeclared variables, type checking aur strings sirf `PRINT` mein use hone ka rule yahan validate nahi hota.
- `student-name` se `ID sub ID` aur `my age` se do identifiers bante hain; declaration valid hai ya nahi, parser decide karega.
