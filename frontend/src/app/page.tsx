'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { tokenize, formatCliOutput, Token, LexicalError, LexerResult } from '@/lib/lexer';
import { EXAMPLES } from '@/lib/examples';

export default function AeroLangIDE() {
  const [code, setCode] = useState<string>(EXAMPLES[0].code);
  const [selectedPreset, setSelectedPreset] = useState<string>('demo');
  const [autoAnalyze, setAutoAnalyze] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'tokens' | 'cli' | 'json' | 'spec'>('tokens');
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [result, setResult] = useState<LexerResult>(() => tokenize(EXAMPLES[0].code));

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runAnalysis = (source: string) => {
    try {
      const res = tokenize(source);
      setResult(res);
    } catch (e: unknown) {
      console.error('Tokenizer error:', e);
    }
  };

  useEffect(() => {
    if (autoAnalyze) {
      runAnalysis(code);
    }
  }, [code, autoAnalyze]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const { selectionStart } = textareaRef.current;
    const linesBefore = code.slice(0, selectionStart).split('\n');
    const lineNum = linesBefore.length;
    const colNum = linesBefore[linesBefore.length - 1].length + 1;
    setCursorPos({ line: lineNum, col: colNum });
    setActiveLine(lineNum);
  };

  const handleSelectPreset = (id: string) => {
    setSelectedPreset(id);
    const ex = EXAMPLES.find((item) => item.id === id);
    if (ex) {
      setCode(ex.code);
      runAnalysis(ex.code);
      setActiveLine(null);
      showToast(`Loaded ${ex.name}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        setCode(content);
        setSelectedPreset('custom');
        runAnalysis(content);
        setActiveLine(null);
        showToast(`Uploaded ${file.name}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    showToast('Code copied');
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText(formatCliOutput(result));
    showToast('CLI output copied');
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    showToast('JSON copied');
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aerolang_tokens.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded JSON');
  };

  const jumpToLine = (targetLine: number) => {
    if (!textareaRef.current) return;
    const lines = code.split('\n');
    let offset = 0;
    for (let i = 0; i < targetLine - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1;
    }
    textareaRef.current.focus();
    const len = lines[targetLine - 1]?.length || 0;
    textareaRef.current.setSelectionRange(offset, offset + len);
    setActiveLine(targetLine);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runAnalysis(code);
      showToast('Analyzed');
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const codeLines = useMemo(() => code.split('\n'), [code]);
  const errorLineSet = useMemo(() => new Set(result.errors.map((e) => e.line)), [result.errors]);

  const getTagClass = (category: string) => {
    if (category === 'Keyword') return 'tag-keyword';
    if (category === 'Identifier') return 'tag-id';
    if (category === 'Integer Constant') return 'tag-num';
    if (category === 'Character Constant') return 'tag-char';
    if (category === 'String Constant') return 'tag-str';
    if (category === 'Delimiter') return 'tag-delim';
    return 'tag-operator';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000000' }}>
      {/* Top Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-name">AeroLang Lexer</span>
          <span className="brand-badge">Lexical Analyzer</span>
        </div>

        <div className="header-summary">
          <div className="summary-pill">
            <span>Tokens:</span>
            <strong>{result.tokens.length}</strong>
          </div>
          <div className="summary-pill">
            <span>Status:</span>
            {result.errors.length === 0 ? (
              <span className="status-clean">0 Errors</span>
            ) : (
              <span className="status-error">{result.errors.length} Errors</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="app-workspace">
        {/* Left Side: Code Editor */}
        <section className="pane pane-left">
          {/* Editor Toolbar with Clean, Visible Controls */}
          <div className="pane-toolbar">
            <div className="toolbar-group">
              <select
                aria-label="Select AeroLang preset program"
                className="clean-select"
                value={selectedPreset}
                onChange={(e) => handleSelectPreset(e.target.value)}
              >
                {EXAMPLES.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
                {selectedPreset === 'custom' && <option value="custom">Custom File</option>}
              </select>

              <button
                className={`btn-toggle ${autoAnalyze ? 'active' : ''}`}
                onClick={() => setAutoAnalyze(!autoAnalyze)}
                title="Toggle instant auto-analysis on typing"
              >
                <div className="toggle-dot" />
                <span>Live</span>
              </button>
            </div>

            <div className="toolbar-group">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".aero,.txt"
                onChange={handleFileUpload}
              />

              <button
                className="btn btn-outline"
                onClick={() => fileInputRef.current?.click()}
                title="Upload AeroLang file from computer"
              >
                Upload
              </button>

              <button
                className="btn btn-outline"
                onClick={handleCopyCode}
                title="Copy code to clipboard"
              >
                Copy
              </button>

              <button
                className="btn btn-danger"
                onClick={() => {
                  setCode('');
                  runAnalysis('');
                  showToast('Cleared');
                }}
                title="Clear code editor"
              >
                Clear
              </button>

              <button
                className="btn btn-primary"
                onClick={() => {
                  runAnalysis(code);
                  showToast('Analysis complete');
                }}
                title="Run analysis (Ctrl+Enter)"
              >
                Tokenize
              </button>
            </div>
          </div>

          {/* Code Editor Body */}
          <div className="editor-frame">
            <div className="editor-line-numbers" ref={gutterRef}>
              {codeLines.map((_, idx) => {
                const lineNum = idx + 1;
                const hasErr = errorLineSet.has(lineNum);
                return (
                  <div
                    key={lineNum}
                    className={`line-num ${hasErr ? 'has-error' : ''}`}
                    onClick={() => jumpToLine(lineNum)}
                    title={hasErr ? `Lexical error on line ${lineNum}` : `Line ${lineNum}`}
                  >
                    {hasErr ? '!' : lineNum}
                  </div>
                );
              })}
            </div>

            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
              onClick={handleCursorMove}
              onKeyUp={handleCursorMove}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder="Type AeroLang code here..."
            />
          </div>

          {/* Editor Status Footer */}
          <div className="editor-status-bar">
            <span>
              Line {cursorPos.line}, Col {cursorPos.col} · {codeLines.length} lines · {code.length} chars
            </span>
            <span>Shortcut: Ctrl+Enter</span>
          </div>
        </section>

        {/* Right Side: Lexical Output */}
        <section className="pane">
          {/* Tab Strip */}
          <div className="tab-strip">
            <button
              className={`tab-btn ${activeTab === 'tokens' ? 'active' : ''}`}
              onClick={() => setActiveTab('tokens')}
            >
              Tokens ({result.tokens.length})
            </button>

            <button
              className={`tab-btn ${activeTab === 'cli' ? 'active' : ''}`}
              onClick={() => setActiveTab('cli')}
            >
              Terminal
            </button>

            <button
              className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
              onClick={() => setActiveTab('json')}
            >
              JSON
            </button>

            <button
              className={`tab-btn ${activeTab === 'spec' ? 'active' : ''}`}
              onClick={() => setActiveTab('spec')}
            >
              Grammar Spec
            </button>
          </div>

          {/* Error Alert Box (Only appears if errors exist) */}
          {result.errors.length > 0 && (
            <div className="error-alert-box">
              <div className="error-alert-title">
                <span>{result.errors.length} Lexical Error{result.errors.length > 1 ? 's' : ''} Detected</span>
              </div>
              <div style={{ maxHeight: '110px', overflowY: 'auto' }}>
                {result.errors.map((err, idx) => (
                  <div key={idx} className="error-row">
                    <div>
                      <span className="error-loc">L{err.line}:{err.column}</span>
                      <span>{err.message}</span>
                      <code style={{ marginLeft: '0.4rem', color: '#fca5a5' }}>
                        {JSON.stringify(err.lexeme)}
                      </code>
                    </div>
                    <button className="btn-goto" onClick={() => jumpToLine(err.line)}>
                      Go to line
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 1: Tokens Table */}
          {activeTab === 'tokens' && (
            <div className="tokens-content">
              {/* Pure Table */}
              <div className="table-scroll-container">
                {result.tokens.length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#71717a' }}>
                    No tokens generated.
                  </div>
                ) : (
                  <table className="pure-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>#</th>
                        <th style={{ width: '70px' }}>Line:Col</th>
                        <th style={{ width: '130px' }}>Token Type</th>
                        <th>Lexeme</th>
                        <th style={{ width: '130px' }}>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.tokens.map((t, idx) => {
                        const isSelected = activeLine === t.line;
                        return (
                          <tr
                            key={idx}
                            className={isSelected ? 'active-row' : ''}
                            onClick={() => jumpToLine(t.line)}
                            title={`Jump to line ${t.line}`}
                          >
                            <td style={{ color: '#52525b' }}>{idx + 1}</td>
                            <td style={{ color: '#38bdf8' }}>
                              {t.line}:{t.column}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: '#ffffff' }}>
                                {t.type}
                              </span>
                            </td>
                            <td>
                              <code style={{ background: '#18181b', padding: '0.1rem 0.4rem', borderRadius: '3px', color: '#e4e4e7' }}>
                                {JSON.stringify(t.lexeme)}
                              </code>
                            </td>
                            <td>
                              <span className={`token-tag ${getTagClass(t.category)}`}>
                                {t.category}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Terminal Output */}
          {activeTab === 'cli' && (
            <div className="raw-output-pane">
              <div className="raw-header">
                <span>$ python aerolang_lexer.py demo.aero</span>
                <button className="btn btn-outline" onClick={handleCopyCli}>
                  Copy CLI Output
                </button>
              </div>
              <div className="raw-content">{formatCliOutput(result)}</div>
            </div>
          )}

          {/* Tab 3: JSON Output */}
          {activeTab === 'json' && (
            <div className="raw-output-pane">
              <div className="raw-header">
                <span>Tokens JSON</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn btn-outline" onClick={handleCopyJson}>
                    Copy JSON
                  </button>
                  <button className="btn btn-outline" onClick={handleDownloadJson}>
                    Download
                  </button>
                </div>
              </div>
              <div className="raw-content">
                {JSON.stringify({ tokens: result.tokens, errors: result.errors }, null, 2)}
              </div>
            </div>
          )}

          {/* Tab 4: Grammar Specification */}
          {activeTab === 'spec' && (
            <div className="spec-pane">
              <div className="spec-section">
                <div className="spec-title">AeroLang Reserved Keywords</div>
                <div className="spec-grid">
                  {[
                    { kw: 'START', token: 'START', desc: 'Program start' },
                    { kw: 'END', token: 'STOP', desc: 'Program end' },
                    { kw: 'NUM', token: 'DT', desc: 'Integer data type' },
                    { kw: 'CHR', token: 'DT', desc: 'Character data type' },
                    { kw: 'GET', token: 'INPUT', desc: 'Read input' },
                    { kw: 'PRINT', token: 'PRINT', desc: 'Output print' },
                    { kw: 'TEST', token: 'IF', desc: 'If condition' },
                    { kw: 'RETEST', token: 'ELSE_IF', desc: 'Else-if condition' },
                    { kw: 'OTHERWISE', token: 'ELSE', desc: 'Else fallback' },
                    { kw: 'CYCLE', token: 'WHILE', desc: 'While loop' },
                  ].map((item) => (
                    <div key={item.kw} className="spec-item">
                      <div className="spec-item-top">
                        <span className="spec-item-title" style={{ color: '#c084fc' }}>{item.kw}</span>
                        <span className="spec-item-sub">{item.token}</span>
                      </div>
                      <div className="spec-item-desc">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="spec-section">
                <div className="spec-title">Operators & Delimiters</div>
                <div className="spec-grid">
                  {[
                    { sym: '+  -  *  /  %', type: 'Arithmetic', desc: 'add, sub, mul, divide, mod' },
                    { sym: '==  !=  <  >  <=  >=', type: 'Relational', desc: 'EQU, NEQU, LT, GT, LE, GE' },
                    { sym: '&&  ||  !', type: 'Logical', desc: 'AND, OR, NOT' },
                    { sym: '=', type: 'Assignment', desc: 'ASSIGN' },
                    { sym: ':  ;  ,', type: 'Delimiter', desc: 'COLON, SEMICOLON, COMMA' },
                    { sym: '(  )', type: 'Delimiter', desc: 'LEFTPAREN, RIGHTPAREN' },
                    { sym: '{  }', type: 'Delimiter', desc: 'LEFTBRACE, RIGHTBRACE' },
                  ].map((item) => (
                    <div key={item.sym} className="spec-item">
                      <div className="spec-item-top">
                        <span className="spec-item-title" style={{ color: '#38bdf8' }}>{item.sym}</span>
                        <span className="spec-item-sub">{item.type}</span>
                      </div>
                      <div className="spec-item-desc">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="spec-section">
                <div className="spec-title">Lexical Invariants</div>
                <ul style={{ fontSize: '0.78rem', color: '#a1a1aa', lineHeight: '1.75', paddingLeft: '1.25rem' }}>
                  <li><strong>Identifiers:</strong> Must begin with an ASCII letter (A-Z or a-z), followed by letters, digits, or underscores. Identifiers starting with a digit (e.g. <code>2a0</code>) cause lexical errors.</li>
                  <li><strong>Character Constants:</strong> Enclosed in single quotes with exactly one ASCII letter (e.g. <code>&apos;A&apos;</code>).</li>
                  <li><strong>String Constants:</strong> Enclosed in double quotes (e.g. <code>&quot;Welcome&quot;</code>).</li>
                  <li><strong>Signs:</strong> + and - are parsed as standalone arithmetic operators.</li>
                </ul>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Ephemeral Toast Notice */}
      {toastMessage && (
        <div className="toast">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
