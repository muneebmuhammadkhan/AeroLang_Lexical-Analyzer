# AeroLang Lexer — Next.js Frontend & Visualizer

A modern, split-screen web IDE and visualizer for the **AeroLang Lexical Analyzer**.

## Features

- **Split-Screen Layout**:
  - **Left**: Source code editor with synchronized line numbering gutter, error badges, active cursor tracker (Ln/Col), Tab indentation, and example selector.
  - **Right**: Multi-tab output inspector featuring:
    - **Tokens Table**: Filterable by token class (Keyword, Identifier, Constants, Operators, Delimiters), real-time search, and CSV export. Clicking any token jumps directly to its line in the editor.
    - **CLI Output**: Exact reproduction of the `python aerolang_lexer.py demo.aero` console output format.
    - **JSON View**: Machine-readable token AST with copy and download options (`--json` parity).
    - **AeroLang Spec**: Built-in reference sheet of keywords, operators, delimiters, and lexical rules.
- **Real-Time Tokenization**: Blazing-fast client-side TypeScript engine (`<1ms`) with live auto-analysis or manual `Ctrl+Enter` execution.
- **Diagnostics & Error Catching**: Highlights lexical errors (e.g. invalid identifiers like `2a0`, unterminated strings, invalid character constants) both in the editor gutter and in an alert panel.
- **Sample Programs**: Pre-loaded samples including `demo.aero`, error tests, variable declarations, and `CYCLE` loops.
- **API Endpoint**: `POST /api/tokenize` supporting both the TypeScript lexer and Python subprocess execution.

## Getting Started

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open **[http://localhost:3000](http://localhost:3000)** in your browser.
