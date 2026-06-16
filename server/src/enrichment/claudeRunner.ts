import { execFile } from 'node:child_process';
import { config } from '../config.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('enrich');

export interface EnrichmentResult {
  fields: Record<string, unknown>;
  meta: {
    website?: string | null;
    summary?: string;
    sources?: string[];
    confidence?: 'low' | 'medium' | 'high';
  };
  raw?: string;
}

/** Pull a JSON object out of arbitrary model text (handles ```json fences). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]! : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in Claude output.');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function runCli(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      prompt,
      '--output-format',
      'json',
      // Allow only web research tools; in headless mode anything else is
      // auto-denied (no hanging on permission prompts).
      '--allowedTools',
      'WebSearch,WebFetch',
    ];
    log.info(`Running: ${config.claude.cli} -p "<prompt>" --output-format json …`);
    execFile(
      config.claude.cli,
      args,
      { timeout: config.claude.timeoutMs, maxBuffer: 64 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            return reject(
              new Error(
                `Claude CLI "${config.claude.cli}" not found on PATH. Install Claude Code or set CLAUDE_CLI in .env.`,
              ),
            );
          }
          return reject(new Error(`Claude CLI failed: ${stderr || err.message}`));
        }
        resolve(stdout);
      },
    );
  });
}

export async function runEnrichment(prompt: string): Promise<EnrichmentResult> {
  const stdout = await runCli(prompt);

  // Headless `--output-format json` wraps the answer in an envelope.
  let resultText = stdout;
  try {
    const envelope = JSON.parse(stdout);
    if (envelope && typeof envelope.result === 'string') resultText = envelope.result;
    if (envelope?.is_error) {
      throw new Error(`Claude reported an error: ${envelope.result ?? 'unknown'}`);
    }
  } catch {
    // Not the expected envelope — fall back to treating stdout as the answer.
  }

  const parsed = extractJson(resultText) as Partial<EnrichmentResult>;
  return {
    fields: (parsed.fields as Record<string, unknown>) ?? {},
    meta: (parsed.meta as EnrichmentResult['meta']) ?? {},
    raw: resultText,
  };
}
