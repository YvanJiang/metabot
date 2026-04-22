import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface SkillMetadata {
  name: string;
  description?: string;
  tools?: string;
}

export async function scanSkills(workingDirectory: string): Promise<SkillMetadata[]> {
  const skillsDir = join(workingDirectory, '.codex', 'skills');
  const skills: SkillMetadata[] = [];

  let entries: string[];
  try {
    entries = await readdir(skillsDir);
  } catch {
    return skills;
  }

  for (const entry of entries) {
    const skillPath = join(skillsDir, entry, 'SKILL.md');
    try {
      const content = await readFile(skillPath, 'utf-8');
      skills.push(parseFrontmatter(content, entry));
    } catch {
      // Skip unreadable entries.
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function parseFrontmatter(content: string, fallbackName: string): SkillMetadata {
  const meta: SkillMetadata = { name: fallbackName };
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return meta;

  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key === 'name' && value) meta.name = value;
    if (key === 'description' && value) meta.description = value;
    if (key === 'allowed-tools' && value) meta.tools = value;
  }

  return meta;
}

const skillCache = new Map<string, { skills: SkillMetadata[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getSkills(workingDirectory: string): Promise<SkillMetadata[]> {
  const cached = skillCache.get(workingDirectory);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.skills;
  }

  const skills = await scanSkills(workingDirectory);
  skillCache.set(workingDirectory, { skills, timestamp: Date.now() });
  return skills;
}
