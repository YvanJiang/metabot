import { describe, expect, it } from 'vitest';
import { StreamProcessor, extractImagePaths } from '../src/codex/stream-processor.js';
import type { SDKMessage } from '../src/codex/executor.js';

function msg(overrides: Partial<SDKMessage>): SDKMessage {
  return { type: 'turn.started', ...overrides } as SDKMessage;
}

describe('StreamProcessor', () => {
  it('starts in thinking status and captures the thread id', () => {
    const p = new StreamProcessor('hello');
    const state = p.processMessage(msg({ type: 'thread.started', thread_id: 'sess-1' }));
    expect(state.status).toBe('thinking');
    expect(state.userPrompt).toBe('hello');
    expect(state.responseText).toBe('');
    expect(state.toolCalls).toEqual([]);
    expect(p.getSessionId()).toBe('sess-1');
  });

  it('tracks agent messages from completed items', () => {
    const p = new StreamProcessor('hi');
    const state = p.processMessage(msg({
      type: 'item.completed',
      item: {
        id: 'msg-1',
        type: 'agent_message',
        text: 'Hello world',
      },
    }));

    expect(state.responseText).toBe('Hello world');
    expect(state.status).toBe('running');
  });

  it('tracks command execution items as tool calls', () => {
    const p = new StreamProcessor('hi');
    const state = p.processMessage(msg({
      type: 'item.started',
      item: {
        id: 'cmd-1',
        type: 'command_execution',
        command: 'npm test',
        aggregated_output: '',
        status: 'in_progress',
      },
    }));

    expect(state.toolCalls).toHaveLength(1);
    expect(state.toolCalls[0].name).toBe('Bash');
    expect(state.toolCalls[0].status).toBe('running');
  });

  it('marks tools as done when command execution completes', () => {
    const p = new StreamProcessor('hi');
    p.processMessage(msg({
      type: 'item.started',
      item: {
        id: 'cmd-1',
        type: 'command_execution',
        command: 'npm test',
        aggregated_output: '',
        status: 'in_progress',
      },
    }));
    const state = p.processMessage(msg({
      type: 'item.completed',
      item: {
        id: 'cmd-1',
        type: 'command_execution',
        command: 'npm test',
        aggregated_output: 'ok',
        exit_code: 0,
        status: 'completed',
      },
    }));

    expect(state.toolCalls[0].status).toBe('done');
  });

  it('tracks file changes, image outputs, and plan paths', () => {
    const p = new StreamProcessor('hi');
    p.processMessage(msg({
      type: 'item.completed',
      item: {
        id: 'patch-1',
        type: 'file_change',
        status: 'completed',
        changes: [
          { path: '/tmp/output.png', kind: 'add' },
          { path: '/tmp/project/.codex/plans/plan.md', kind: 'update' },
        ],
      },
    }));

    expect(p.getImagePaths()).toEqual(['/tmp/output.png']);
    expect(p.getPlanFilePath()).toBe('/tmp/project/.codex/plans/plan.md');
  });

  it('processes turn.completed as complete and records usage', () => {
    const p = new StreamProcessor('hi');
    p.processMessage(msg({
      type: 'item.completed',
      item: {
        id: 'msg-1',
        type: 'agent_message',
        text: 'Done!',
      },
    }));

    const state = p.processMessage(msg({
      type: 'turn.completed',
      duration_ms: 1200,
      usage: {
        input_tokens: 100,
        cached_input_tokens: 20,
        output_tokens: 40,
      },
    }));

    expect(state.status).toBe('complete');
    expect(state.responseText).toBe('Done!');
    expect(state.durationMs).toBe(1200);
    expect(state.totalTokens).toBe(160);
  });

  it('processes turn.failed as error', () => {
    const p = new StreamProcessor('hi');
    const state = p.processMessage(msg({
      type: 'turn.failed',
      duration_ms: 500,
      error: { message: 'Something failed' },
    }));

    expect(state.status).toBe('error');
    expect(state.errorMessage).toBe('Something failed');
  });

  it('returns null for pending questions because Codex stream has no structured ask-user event', () => {
    const p = new StreamProcessor('hi');
    expect(p.getPendingQuestion()).toBeNull();
    expect(p.drainSdkHandledTools()).toEqual([]);
  });
});

describe('extractImagePaths', () => {
  it('extracts image paths from text', () => {
    const text = 'Created file at /tmp/img/chart.png and /home/user/photo.jpg';
    const paths = extractImagePaths(text);
    expect(paths).toContain('/tmp/img/chart.png');
    expect(paths).toContain('/home/user/photo.jpg');
  });

  it('returns empty for no matches', () => {
    expect(extractImagePaths('no images here')).toEqual([]);
  });

  it('deduplicates paths', () => {
    const text = '/tmp/a.png and /tmp/a.png again';
    expect(extractImagePaths(text)).toHaveLength(1);
  });
});
