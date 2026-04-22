import 'dotenv/config';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Shared config fields used by MessageBridge and CodexExecutor (platform-agnostic). */
export interface BotConfigBase {
  name: string;
  description?: string;
  specialties?: string[];
  icon?: string;
  maxConcurrentTasks?: number;
  budgetLimitDaily?: number;
  ttsVoice?: string;
  codex: {
    defaultWorkingDirectory: string;
    maxTurns: number | undefined;
    maxBudgetUsd: number | undefined;
    model: string | undefined;
    /** Optional API key override for this bot. Leave unset to use Codex login or process env. */
    apiKey: string | undefined;
    outputsBaseDir: string;
    downloadsDir: string;
  };
}

export interface BotConfig extends BotConfigBase {
  feishu: {
    appId: string;
    appSecret: string;
  };
  groupNoMention?: boolean;
}

export interface TelegramBotConfig extends BotConfigBase {
  telegram: {
    botToken: string;
  };
}

export interface WechatBotConfig extends BotConfigBase {
  wechat: {
    ilinkBaseUrl?: string;
    botToken?: string;
  };
}

export interface PeerConfig {
  name: string;
  url: string;
  secret?: string;
}

export interface AppConfig {
  feishuBots: BotConfig[];
  telegramBots: TelegramBotConfig[];
  webBots: BotConfigBase[];
  wechatBots: WechatBotConfig[];
  feishuService?: {
    appId: string;
    appSecret: string;
  };
  log: {
    level: string;
  };
  memoryServerUrl: string;
  api: {
    port: number;
    secret?: string;
  };
  memory: {
    enabled: boolean;
    port: number;
    databaseDir: string;
    secret: string;
    adminToken?: string;
    readerToken?: string;
  };
  peers: PeerConfig[];
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function expandUserPath(value: string): string {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

export interface FeishuBotJsonEntry {
  name: string;
  description?: string;
  specialties?: string[];
  icon?: string;
  maxConcurrentTasks?: number;
  budgetLimitDaily?: number;
  ttsVoice?: string;
  feishuAppId: string;
  feishuAppSecret: string;
  defaultWorkingDirectory: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  model?: string;
  apiKey?: string;
  outputsBaseDir?: string;
  downloadsDir?: string;
  groupNoMention?: boolean;
}

export interface TelegramBotJsonEntry {
  name: string;
  description?: string;
  specialties?: string[];
  icon?: string;
  maxConcurrentTasks?: number;
  budgetLimitDaily?: number;
  ttsVoice?: string;
  telegramBotToken: string;
  defaultWorkingDirectory: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  model?: string;
  apiKey?: string;
  outputsBaseDir?: string;
  downloadsDir?: string;
}

export interface WebBotJsonEntry {
  name: string;
  description?: string;
  specialties?: string[];
  icon?: string;
  maxConcurrentTasks?: number;
  budgetLimitDaily?: number;
  ttsVoice?: string;
  defaultWorkingDirectory: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  model?: string;
  apiKey?: string;
  outputsBaseDir?: string;
  downloadsDir?: string;
}

export interface WechatBotJsonEntry {
  name: string;
  description?: string;
  ilinkBaseUrl?: string;
  wechatBotToken?: string;
  defaultWorkingDirectory: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  model?: string;
  apiKey?: string;
  outputsBaseDir?: string;
  downloadsDir?: string;
}

export interface PeerJsonEntry {
  name: string;
  url: string;
  secret?: string;
}

export interface BotsJsonNewFormat {
  feishuBots?: FeishuBotJsonEntry[];
  telegramBots?: TelegramBotJsonEntry[];
  webBots?: WebBotJsonEntry[];
  wechatBots?: WechatBotJsonEntry[];
  peers?: PeerJsonEntry[];
}

function buildCodexConfig(entry: {
  defaultWorkingDirectory: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  model?: string;
  apiKey?: string;
  outputsBaseDir?: string;
  downloadsDir?: string;
}): BotConfigBase['codex'] {
  return {
    defaultWorkingDirectory: expandUserPath(entry.defaultWorkingDirectory),
    maxTurns: entry.maxTurns ?? (process.env.CODEX_MAX_TURNS ? parseInt(process.env.CODEX_MAX_TURNS, 10) : undefined),
    maxBudgetUsd: entry.maxBudgetUsd ?? (process.env.CODEX_MAX_BUDGET_USD ? parseFloat(process.env.CODEX_MAX_BUDGET_USD) : undefined),
    model: entry.model || process.env.CODEX_MODEL || 'gpt-5-codex',
    apiKey: entry.apiKey || undefined,
    outputsBaseDir: expandUserPath(entry.outputsBaseDir || process.env.OUTPUTS_BASE_DIR || path.join(os.tmpdir(), `metabot-outputs-${os.userInfo().username}`)),
    downloadsDir: expandUserPath(entry.downloadsDir || process.env.DOWNLOADS_DIR || path.join(os.tmpdir(), `metabot-downloads-${os.userInfo().username}`)),
  };
}

function feishuBotFromJson(entry: FeishuBotJsonEntry): BotConfig {
  return {
    name: entry.name,
    ...(entry.description ? { description: entry.description } : {}),
    ...(entry.specialties?.length ? { specialties: entry.specialties } : {}),
    ...(entry.icon ? { icon: entry.icon } : {}),
    ...(entry.maxConcurrentTasks != null ? { maxConcurrentTasks: entry.maxConcurrentTasks } : {}),
    ...(entry.budgetLimitDaily != null ? { budgetLimitDaily: entry.budgetLimitDaily } : {}),
    ...(entry.ttsVoice ? { ttsVoice: entry.ttsVoice } : {}),
    ...(entry.groupNoMention ? { groupNoMention: true } : {}),
    feishu: {
      appId: entry.feishuAppId,
      appSecret: entry.feishuAppSecret,
    },
    codex: buildCodexConfig(entry),
  };
}

function telegramBotFromJson(entry: TelegramBotJsonEntry): TelegramBotConfig {
  return {
    name: entry.name,
    ...(entry.description ? { description: entry.description } : {}),
    ...(entry.specialties?.length ? { specialties: entry.specialties } : {}),
    ...(entry.icon ? { icon: entry.icon } : {}),
    ...(entry.maxConcurrentTasks != null ? { maxConcurrentTasks: entry.maxConcurrentTasks } : {}),
    ...(entry.budgetLimitDaily != null ? { budgetLimitDaily: entry.budgetLimitDaily } : {}),
    ...(entry.ttsVoice ? { ttsVoice: entry.ttsVoice } : {}),
    telegram: {
      botToken: entry.telegramBotToken,
    },
    codex: buildCodexConfig(entry),
  };
}

export function webBotFromJson(entry: WebBotJsonEntry): BotConfigBase {
  return {
    name: entry.name,
    ...(entry.description ? { description: entry.description } : {}),
    ...(entry.specialties?.length ? { specialties: entry.specialties } : {}),
    ...(entry.icon ? { icon: entry.icon } : {}),
    ...(entry.maxConcurrentTasks != null ? { maxConcurrentTasks: entry.maxConcurrentTasks } : {}),
    ...(entry.budgetLimitDaily != null ? { budgetLimitDaily: entry.budgetLimitDaily } : {}),
    ...(entry.ttsVoice ? { ttsVoice: entry.ttsVoice } : {}),
    codex: buildCodexConfig(entry),
  };
}

function wechatBotFromJson(entry: WechatBotJsonEntry): WechatBotConfig {
  return {
    name: entry.name,
    ...(entry.description ? { description: entry.description } : {}),
    wechat: {
      ilinkBaseUrl: entry.ilinkBaseUrl,
      botToken: entry.wechatBotToken,
    },
    codex: buildCodexConfig(entry),
  };
}

function feishuBotFromEnv(): BotConfig {
  return {
    name: 'default',
    feishu: {
      appId: required('FEISHU_APP_ID'),
      appSecret: required('FEISHU_APP_SECRET'),
    },
    codex: {
      defaultWorkingDirectory: expandUserPath(required('CODEX_DEFAULT_WORKING_DIRECTORY')),
      maxTurns: process.env.CODEX_MAX_TURNS ? parseInt(process.env.CODEX_MAX_TURNS, 10) : undefined,
      maxBudgetUsd: process.env.CODEX_MAX_BUDGET_USD ? parseFloat(process.env.CODEX_MAX_BUDGET_USD) : undefined,
      model: process.env.CODEX_MODEL || 'gpt-5-codex',
      apiKey: undefined,
      outputsBaseDir: expandUserPath(process.env.OUTPUTS_BASE_DIR || path.join(os.tmpdir(), `metabot-outputs-${os.userInfo().username}`)),
      downloadsDir: expandUserPath(process.env.DOWNLOADS_DIR || path.join(os.tmpdir(), `metabot-downloads-${os.userInfo().username}`)),
    },
  };
}

function telegramBotFromEnv(): TelegramBotConfig {
  return {
    name: 'telegram-default',
    telegram: {
      botToken: required('TELEGRAM_BOT_TOKEN'),
    },
    codex: {
      defaultWorkingDirectory: expandUserPath(required('CODEX_DEFAULT_WORKING_DIRECTORY')),
      maxTurns: process.env.CODEX_MAX_TURNS ? parseInt(process.env.CODEX_MAX_TURNS, 10) : undefined,
      maxBudgetUsd: process.env.CODEX_MAX_BUDGET_USD ? parseFloat(process.env.CODEX_MAX_BUDGET_USD) : undefined,
      model: process.env.CODEX_MODEL || 'gpt-5-codex',
      apiKey: undefined,
      outputsBaseDir: expandUserPath(process.env.OUTPUTS_BASE_DIR || path.join(os.tmpdir(), `metabot-outputs-${os.userInfo().username}`)),
      downloadsDir: expandUserPath(process.env.DOWNLOADS_DIR || path.join(os.tmpdir(), `metabot-downloads-${os.userInfo().username}`)),
    },
  };
}

function wechatBotFromEnv(): WechatBotConfig {
  return {
    name: 'wechat-default',
    wechat: {
      botToken: process.env.WECHAT_BOT_TOKEN || undefined,
    },
    codex: {
      defaultWorkingDirectory: expandUserPath(required('CODEX_DEFAULT_WORKING_DIRECTORY')),
      maxTurns: process.env.CODEX_MAX_TURNS ? parseInt(process.env.CODEX_MAX_TURNS, 10) : undefined,
      maxBudgetUsd: process.env.CODEX_MAX_BUDGET_USD ? parseFloat(process.env.CODEX_MAX_BUDGET_USD) : undefined,
      model: process.env.CODEX_MODEL || 'gpt-5-codex',
      apiKey: undefined,
      outputsBaseDir: expandUserPath(process.env.OUTPUTS_BASE_DIR || path.join(os.tmpdir(), `metabot-outputs-${os.userInfo().username}`)),
      downloadsDir: expandUserPath(process.env.DOWNLOADS_DIR || path.join(os.tmpdir(), `metabot-downloads-${os.userInfo().username}`)),
    },
  };
}

export function loadAppConfig(): AppConfig {
  const botsConfigPath = process.env.BOTS_CONFIG;

  let feishuBots: BotConfig[] = [];
  let telegramBots: TelegramBotConfig[] = [];
  let webBots: BotConfigBase[] = [];
  let wechatBots: WechatBotConfig[] = [];
  let parsedConfig: unknown;

  if (botsConfigPath) {
    const resolved = path.resolve(botsConfigPath);
    const raw = fs.readFileSync(resolved, 'utf-8');
    const parsed = JSON.parse(raw);
    parsedConfig = parsed;

    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        throw new Error(`BOTS_CONFIG file must contain a non-empty array or object: ${resolved}`);
      }
      feishuBots = (parsed as FeishuBotJsonEntry[]).map(feishuBotFromJson);
    } else if (parsed && typeof parsed === 'object') {
      const cfg = parsed as BotsJsonNewFormat;
      if (cfg.feishuBots) feishuBots = cfg.feishuBots.map(feishuBotFromJson);
      if (cfg.telegramBots) telegramBots = cfg.telegramBots.map(telegramBotFromJson);
      if (cfg.webBots) webBots = cfg.webBots.map(webBotFromJson);
      if (cfg.wechatBots) wechatBots = cfg.wechatBots.map(wechatBotFromJson);
      if (feishuBots.length === 0 && telegramBots.length === 0 && webBots.length === 0 && wechatBots.length === 0) {
        throw new Error(`BOTS_CONFIG file must define at least one bot: ${resolved}`);
      }
    } else {
      throw new Error(`BOTS_CONFIG file must contain a JSON array or object: ${resolved}`);
    }
  } else {
    if (process.env.FEISHU_APP_ID) feishuBots = [feishuBotFromEnv()];
    if (process.env.TELEGRAM_BOT_TOKEN) telegramBots = [telegramBotFromEnv()];
    if (process.env.WECHAT_BOT_TOKEN || process.env.WECHAT_ILINK_ENABLED === 'true') {
      wechatBots = [wechatBotFromEnv()];
    }
    if (feishuBots.length === 0 && telegramBots.length === 0 && wechatBots.length === 0) {
      throw new Error('No bot configured. Set FEISHU_APP_ID/FEISHU_APP_SECRET, TELEGRAM_BOT_TOKEN, or WECHAT_ILINK_ENABLED=true, or use BOTS_CONFIG for multi-bot mode.');
    }
  }

  const memoryServerUrl = (process.env.META_MEMORY_URL || process.env.MEMORY_SERVER_URL || 'http://localhost:8100').replace(/\/+$/, '');
  const apiPort = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 9100;
  const apiSecret = process.env.API_SECRET || undefined;

  process.env.METABOT_API_PORT = String(apiPort);
  if (apiSecret) process.env.METABOT_API_SECRET = apiSecret;

  let feishuService: AppConfig['feishuService'];
  if (process.env.FEISHU_SERVICE_APP_ID && process.env.FEISHU_SERVICE_APP_SECRET) {
    feishuService = {
      appId: process.env.FEISHU_SERVICE_APP_ID,
      appSecret: process.env.FEISHU_SERVICE_APP_SECRET,
    };
  } else if (feishuBots.length > 0) {
    feishuService = {
      appId: feishuBots[0].feishu.appId,
      appSecret: feishuBots[0].feishu.appSecret,
    };
  }

  const memoryEnabled = process.env.MEMORY_ENABLED !== 'false';
  const memoryPort = process.env.MEMORY_PORT ? parseInt(process.env.MEMORY_PORT, 10) : 8100;
  const memoryDatabaseDir = process.env.MEMORY_DATABASE_DIR || './data';
  const memorySecret = process.env.MEMORY_SECRET || process.env.API_SECRET || '';
  const memoryAdminToken = process.env.MEMORY_ADMIN_TOKEN || undefined;
  const memoryReaderToken = process.env.MEMORY_TOKEN || undefined;

  const peers: PeerConfig[] = [];
  if (botsConfigPath && parsedConfig && !Array.isArray(parsedConfig)) {
    const cfg = parsedConfig as BotsJsonNewFormat;
    if (cfg.peers) {
      for (const p of cfg.peers) {
        peers.push({ name: p.name, url: p.url.replace(/\/+$/, ''), secret: p.secret });
      }
    }
  }
  if (process.env.METABOT_PEERS) {
    const urls = process.env.METABOT_PEERS.split(',').map((u) => u.trim()).filter(Boolean);
    const secrets = (process.env.METABOT_PEER_SECRETS || '').split(',').map((s) => s.trim());
    const names = (process.env.METABOT_PEER_NAMES || '').split(',').map((s) => s.trim());
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].replace(/\/+$/, '');
      if (!peers.some((p) => p.url === url)) {
        const autoName = names[i] || url.replace(/^https?:\/\//, '').replace(/[:.]/g, '-');
        peers.push({ name: autoName, url, secret: secrets[i] || undefined });
      }
    }
  }

  return {
    feishuBots,
    telegramBots,
    webBots,
    wechatBots,
    feishuService,
    log: {
      level: process.env.LOG_LEVEL || 'info',
    },
    memoryServerUrl,
    api: {
      port: apiPort,
      secret: apiSecret,
    },
    memory: {
      enabled: memoryEnabled,
      port: memoryPort,
      databaseDir: memoryDatabaseDir,
      secret: memorySecret,
      adminToken: memoryAdminToken,
      readerToken: memoryReaderToken,
    },
    peers,
  };
}
