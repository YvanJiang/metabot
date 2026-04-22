import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as url from 'node:url';
import { execFileSync, execSync } from 'node:child_process';
import type { Logger } from '../utils/logger.js';

/** Skills installed for all platforms. */
const COMMON_SKILLS = ['metaskill', 'metamemory', 'codexbot', 'phone-call', 'skill-hub'];

/** Lark CLI AI Agent skills — installed via `npx skills add larksuite/cli` and
 *  symlinked into ~/.codex/skills/ automatically. We copy them to the bot
 *  working directory so they are available in the Codex session. */
const LARK_CLI_SKILLS = [
  'lark-base', 'lark-calendar', 'lark-contact', 'lark-doc', 'lark-drive',
  'lark-event', 'lark-im', 'lark-mail', 'lark-minutes', 'lark-openapi-explorer',
  'lark-shared', 'lark-sheets', 'lark-skill-maker', 'lark-task', 'lark-vc',
  'lark-whiteboard', 'lark-wiki', 'lark-workflow-meeting-summary',
  'lark-workflow-standup-report',
];

export interface InstallSkillsOptions {
  /** Bot platform — feishu-only skills are skipped for other platforms. */
  platform?: 'feishu' | 'telegram' | 'web' | 'wechat';
  /** Feishu app credentials for lark-cli auto-config (feishu only). */
  feishuAppId?: string;
  feishuAppSecret?: string;
}

export function installSkillsToWorkDir(workDir: string, logger: Logger, options?: InstallSkillsOptions): void {
  const userSkillsDir = path.join(os.homedir(), '.codex', 'skills');
  const destSkillsDir = path.join(workDir, '.codex', 'skills');

  const skillNames = options?.platform === 'feishu'
    ? [...COMMON_SKILLS, ...LARK_CLI_SKILLS]
    : COMMON_SKILLS;

  for (const skill of skillNames) {
    const src = path.join(userSkillsDir, skill);

    if (!fs.existsSync(src)) {
      logger.debug({ skill }, 'Skill source not found, skipping');
      continue;
    }

    const dest = path.join(destSkillsDir, skill);
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    logger.info({ skill, src, dest }, 'Skill installed to working directory');
  }

  // For Feishu bots, ensure lark-cli is configured
  if (options?.platform === 'feishu' && options.feishuAppId && options.feishuAppSecret) {
    ensureLarkCliConfig(options.feishuAppId, options.feishuAppSecret, logger);
  }

  // Deploy workspace AGENTS.md if not already present
  const destAgentsMd = path.join(workDir, 'AGENTS.md');
  if (!fs.existsSync(destAgentsMd)) {
    const thisFile = url.fileURLToPath(import.meta.url);
    const thisDir = path.dirname(thisFile);
    // Try src/workspace/AGENTS.md (tsx) or dist/workspace/AGENTS.md (compiled)
    for (const candidate of [
      path.join(thisDir, '..', 'workspace', 'AGENTS.md'),
      path.join(thisDir, '..', '..', 'src', 'workspace', 'AGENTS.md'),
    ]) {
      if (fs.existsSync(candidate)) {
        fs.copyFileSync(candidate, destAgentsMd);
        logger.info({ dest: destAgentsMd }, 'AGENTS.md deployed to working directory');
        break;
      }
    }
  }
}

/**
 * Ensure lark-cli is configured with Feishu app credentials.
 * Skips if ~/.lark-cli/config.json already exists.
 */
function ensureLarkCliConfig(appId: string, appSecret: string, logger: Logger): void {
  const configPath = path.join(os.homedir(), '.lark-cli', 'config.json');
  if (fs.existsSync(configPath)) {
    logger.debug('lark-cli already configured, skipping');
    return;
  }

  // Find lark-cli binary
  const larkCliBin = findLarkCli();
  if (!larkCliBin) {
    logger.warn('lark-cli not found in PATH or ~/.npm-global/bin — skipping config. Run: npm install -g @larksuite/cli');
    return;
  }

  try {
    execFileSync(larkCliBin, ['config', 'init', '--app-id', appId, '--app-secret-stdin', '--brand', 'feishu'], {
      input: appSecret,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15_000,
    });
    logger.info({ appId }, 'lark-cli configured successfully');
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to configure lark-cli — you can run manually: lark-cli config init');
  }
}

/**
 * Install a skill from the Skill Hub into a bot's working directory.
 * Writes SKILL.md and optionally extracts references/ from a tar buffer.
 */
export function installSkillFromHub(
  workDir: string,
  skillName: string,
  skillMd: string,
  referencesTar: Buffer | undefined,
  logger: Logger,
): void {
  const destDir = path.join(workDir, '.codex', 'skills', skillName);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, 'SKILL.md'), skillMd, 'utf-8');

  if (referencesTar && referencesTar.length > 0) {
    try {
      execSync(`tar xf - -C "${destDir}"`, { input: referencesTar, stdio: ['pipe', 'pipe', 'pipe'], timeout: 30_000 });
    } catch (err: any) {
      logger.warn({ err: err.message, skillName }, 'Failed to extract references tar');
    }
  }

  logger.info({ skillName, dest: destDir }, 'Skill installed from Hub');
}

/** Locate the lark-cli executable. */
function findLarkCli(): string | null {
  const candidates = [
    path.join(os.homedir(), '.npm-global', 'bin', 'lark-cli'),
    '/usr/local/bin/lark-cli',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Try PATH via which
  try {
    const result = execFileSync('which', ['lark-cli'], { stdio: ['pipe', 'pipe', 'pipe'], timeout: 5_000 });
    const p = result.toString().trim();
    if (p) return p;
  } catch { /* not in PATH */ }
  return null;
}
