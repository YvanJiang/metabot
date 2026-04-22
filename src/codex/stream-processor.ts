import type { SDKMessage, ThreadItem } from './executor.js';
import type { CardState, PendingQuestion, ToolCall } from '../feishu/card-builder.js';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.tiff']);

export interface DetectedTool {
  toolUseId: string;
  name: string;
}

export class StreamProcessor {
  private responseText = '';
  private toolCalls: ToolCall[] = [];
  private toolIndexes = new Map<string, number>();
  private sessionId: string | undefined;
  private costUsd: number | undefined;
  private durationMs: number | undefined;
  private imagePaths = new Set<string>();
  private planFilePath: string | null = null;
  private model: string | undefined;
  private totalTokens: number | undefined;
  private contextWindow: number | undefined;

  constructor(private userPrompt: string) {}

  processMessage(message: SDKMessage): CardState {
    if ('thread_id' in message && message.thread_id) {
      this.sessionId = message.thread_id;
    }

    switch (message.type) {
      case 'thread.started':
      case 'turn.started':
        return this.buildState('thinking');

      case 'item.started':
      case 'item.updated':
      case 'item.completed':
        if (message.item) {
          this.processItem(message.item, message.type);
        }
        return this.buildState(this.toolCalls.some((tool) => tool.status === 'running') || this.responseText ? 'running' : 'thinking');

      case 'turn.completed':
        this.durationMs = message.duration_ms;
        this.totalTokens = (message.usage?.input_tokens ?? 0)
          + (message.usage?.cached_input_tokens ?? 0)
          + (message.usage?.output_tokens ?? 0);
        this.markAllToolsDone();
        return this.buildState('complete');

      case 'turn.failed':
        this.durationMs = message.duration_ms;
        this.markAllToolsDone();
        return {
          ...this.buildState('error'),
          errorMessage: message.error?.message || 'Codex turn failed',
        };

      case 'error':
        this.durationMs = message.duration_ms;
        this.markAllToolsDone();
        return {
          ...this.buildState('error'),
          errorMessage: message.message,
        };
    }
  }

  clearPendingQuestion(): void {
    // Codex SDK does not currently expose structured AskUserQuestion equivalents.
  }

  getPendingQuestion(): PendingQuestion | null {
    return null;
  }

  drainSdkHandledTools(): DetectedTool[] {
    return [];
  }

  getCurrentState(): CardState {
    return this.buildState(this.toolCalls.some((tool) => tool.status === 'running') || this.responseText ? 'running' : 'thinking');
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getImagePaths(): string[] {
    return [...this.imagePaths];
  }

  getPlanFilePath(): string | null {
    return this.planFilePath;
  }

  private buildState(status: CardState['status']): CardState {
    return {
      status,
      userPrompt: this.userPrompt,
      responseText: this.responseText,
      toolCalls: [...this.toolCalls],
      costUsd: this.costUsd,
      durationMs: this.durationMs,
      model: this.model,
      totalTokens: this.totalTokens,
      contextWindow: this.contextWindow,
    };
  }

  private processItem(item: ThreadItem, eventType: 'item.started' | 'item.updated' | 'item.completed'): void {
    switch (item.type) {
      case 'agent_message':
        this.responseText = item.text;
        return;

      case 'command_execution':
        this.upsertTool(item.id, 'Bash', truncate(item.command, 80), item.status === 'in_progress' && eventType !== 'item.completed' ? 'running' : 'done');
        return;

      case 'mcp_tool_call':
        this.upsertTool(item.id, item.tool, `${item.server}${item.arguments ? ` · ${truncate(JSON.stringify(item.arguments), 80)}` : ''}`, item.status === 'in_progress' && eventType !== 'item.completed' ? 'running' : 'done');
        return;

      case 'web_search':
        this.upsertTool(item.id, 'WebSearch', truncate(item.query, 80), eventType === 'item.completed' ? 'done' : 'running');
        return;

      case 'file_change': {
        const detail = item.changes.map((change) => shortenPath(change.path)).slice(0, 3).join(', ');
        this.upsertTool(item.id, 'ApplyPatch', detail, item.status === 'completed' ? 'done' : 'running');
        for (const change of item.changes) {
          if (isImagePath(change.path)) this.imagePaths.add(change.path);
          if (change.path.includes('.codex/plans/') && change.path.endsWith('.md')) {
            this.planFilePath = change.path;
          }
        }
        return;
      }

      case 'todo_list': {
        const completed = item.items.filter((todo) => todo.completed).length;
        const detail = `${completed}/${item.items.length} tasks`;
        this.upsertTool(item.id, 'TodoList', detail, eventType === 'item.completed' ? 'done' : 'running');
        return;
      }

      case 'reasoning':
      case 'error':
        return;
    }
  }

  private upsertTool(id: string, name: string, detail: string, status: ToolCall['status']): void {
    const existing = this.toolIndexes.get(id);
    if (existing === undefined) {
      this.toolIndexes.set(id, this.toolCalls.length);
      this.toolCalls.push({ name, detail, status });
      return;
    }

    this.toolCalls[existing] = { name, detail, status };
  }

  private markAllToolsDone(): void {
    this.toolCalls = this.toolCalls.map((tool) => ({ ...tool, status: 'done' }));
  }
}

export function extractImagePaths(text: string): string[] {
  const pathRegex = /\/[\w./_-]+\.(?:png|jpe?g|gif|webp|bmp|svg|tiff)/gi;
  const matches = text.match(pathRegex) || [];
  return [...new Set(matches)];
}

function isImagePath(filePath: string): boolean {
  const index = filePath.lastIndexOf('.');
  if (index === -1) return false;
  return IMAGE_EXTENSIONS.has(filePath.slice(index).toLowerCase());
}

function shortenPath(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 3) return filePath;
  return `.../${parts.slice(-2).join('/')}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}
