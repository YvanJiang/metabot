import { Codex, type ThreadEvent, type ThreadItem, type Usage } from '@openai/codex-sdk';
import type { BotConfigBase } from '../config.js';
import type { Logger } from '../utils/logger.js';

export interface ApiContext {
  botName: string;
  chatId: string;
  groupMembers?: string[];
  groupId?: string;
}

export interface ExecutorOptions {
  prompt: string;
  cwd: string;
  sessionId?: string;
  abortController: AbortController;
  outputsDir?: string;
  apiContext?: ApiContext;
  maxTurns?: number;
  model?: string;
  allowedTools?: string[];
}

export interface SDKMessage {
  type: ThreadEvent['type'] | 'error';
  thread_id?: string;
  duration_ms?: number;
  usage?: Usage;
  error?: { message: string };
  message?: string;
  item?: ThreadItem;
}

export interface ExecutionHandle {
  stream: AsyncGenerator<SDKMessage>;
  sendAnswer(toolUseId: string, sessionId: string, answerText: string): void;
  finish(): void;
}

function buildPrompt(prompt: string, outputsDir?: string, apiContext?: ApiContext, allowedTools?: string[]): string {
  const prefix: string[] = [];

  if (outputsDir) {
    prefix.push(
      `Output files for the user must be copied into: ${outputsDir}.`,
      'Use shell commands to copy any generated image, PDF, archive, or document there before you finish.'
    );
  }

  if (apiContext) {
    prefix.push(
      `You are running as bot "${apiContext.botName}" in chat "${apiContext.chatId}".`,
      'Use the /metabot skill for API details when needed.'
    );

    if (apiContext.groupMembers && apiContext.groupMembers.length > 0) {
      const others = apiContext.groupMembers.filter((member) => member !== apiContext.botName);
      if (others.length > 0) {
        if (apiContext.groupId) {
          prefix.push(
            `This is group ${apiContext.groupId}. Other bots in the group: ${others.join(', ')}.`,
            `To talk to another bot, use: mb talk <botName> grouptalk-${apiContext.groupId}-<botName> "message".`
          );
        } else {
          prefix.push(`Other bots in this group: ${others.join(', ')}.`);
        }
      }
    }
  }

  if (allowedTools) {
    if (allowedTools.length === 0) {
      prefix.push('Do not use tools unless absolutely required to answer. Prefer a direct text response.');
    } else {
      prefix.push(`Prefer this tool subset when acting: ${allowedTools.join(', ')}.`);
    }
  }

  if (prefix.length === 0) return prompt;
  return `${prefix.join('\n')}\n\nUser request:\n${prompt}`;
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || /aborted/i.test(error.message);
}

function getThreadId(event: ThreadEvent, fallback?: string | null): string | undefined {
  if (event.type === 'thread.started') return event.thread_id;
  return fallback || undefined;
}

export class CodexExecutor {
  constructor(
    private config: BotConfigBase,
    private logger: Logger,
  ) {}

  startExecution(options: ExecutorOptions): ExecutionHandle {
    const stream = this.runStream(options);
    return {
      stream,
      sendAnswer: (toolUseId: string, sessionId: string, _answerText: string) => {
        this.logger.warn({ toolUseId, sessionId }, 'Codex SDK does not expose interactive question answers; ignoring sendAnswer');
      },
      finish: () => {
        // The AbortController provided in ExecutorOptions is the cancellation source.
      },
    };
  }

  async *execute(options: ExecutorOptions): AsyncGenerator<SDKMessage> {
    yield* this.runStream(options);
  }

  private async *runStream(options: ExecutorOptions): AsyncGenerator<SDKMessage> {
    const startTime = Date.now();
    const prompt = buildPrompt(options.prompt, options.outputsDir, options.apiContext, options.allowedTools);
    const model = options.model || this.config.codex.model;
    const codex = new Codex({
      codexPathOverride: process.env.CODEX_EXECUTABLE_PATH || undefined,
      apiKey: this.config.codex.apiKey,
    });

    const thread = options.sessionId
      ? codex.resumeThread(options.sessionId, {
          model,
          sandboxMode: 'danger-full-access',
          workingDirectory: options.cwd,
          skipGitRepoCheck: true,
          approvalPolicy: 'never',
          networkAccessEnabled: true,
        })
      : codex.startThread({
          model,
          sandboxMode: 'danger-full-access',
          workingDirectory: options.cwd,
          skipGitRepoCheck: true,
          approvalPolicy: 'never',
          networkAccessEnabled: true,
        });

    this.logger.info({ cwd: options.cwd, hasSession: !!options.sessionId, model }, 'Starting Codex execution');

    try {
      const { events } = await thread.runStreamed(prompt, { signal: options.abortController.signal });
      for await (const event of events) {
        const message: SDKMessage = {
          ...event,
          thread_id: getThreadId(event, thread.id),
        };
        if (event.type === 'turn.completed' || event.type === 'turn.failed') {
          message.duration_ms = Date.now() - startTime;
        }
        yield message;
      }
    } catch (error) {
      if (isAbortError(error) || options.abortController.signal.aborted) {
        this.logger.info('Codex execution aborted');
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      yield {
        type: 'error',
        message,
        duration_ms: Date.now() - startTime,
        thread_id: thread.id || undefined,
      };
    }
  }
}

export type { ThreadItem };
