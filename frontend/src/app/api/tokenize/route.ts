import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { tokenize as tsTokenize } from '@/lib/lexer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, engine = 'auto' } = body;

    if (typeof code !== 'string') {
      return NextResponse.json({ error: 'Code must be a string' }, { status: 400 });
    }

    // If client requested python specifically or auto with python preferred
    if (engine === 'python') {
      const pyResult = await runPythonLexer(code);
      if (pyResult) {
        return NextResponse.json(pyResult);
      }
    }

    // Default to ultra-fast TypeScript engine
    const tsResult = tsTokenize(code);
    return NextResponse.json({
      tokens: tsResult.tokens,
      errors: tsResult.errors,
      engine: 'typescript',
      executionTimeMs: tsResult.executionTimeMs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function runPythonLexer(code: string): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.resolve(process.cwd(), '..', 'aerolang_lexer.py');
      const pyProcess = spawn('python', [scriptPath, '-', '--json']);

      let stdout = '';
      let stderr = '';

      pyProcess.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      pyProcess.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      pyProcess.on('error', () => {
        // Fallback silently if python command is unavailable in next server environment
        resolve(null);
      });

      pyProcess.on('close', () => {
        try {
          const parsed = JSON.parse(stdout);
          resolve({
            tokens: parsed.tokens || [],
            errors: parsed.errors || [],
            engine: 'python',
          });
        } catch {
          resolve(null);
        }
      });

      pyProcess.stdin.write(code);
      pyProcess.stdin.end();
    } catch {
      resolve(null);
    }
  });
}
