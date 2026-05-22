import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { scanProject } from '../src/scanners/projectScanner.js';
import { parseReadme } from '../src/scanners/readmeParser.js';

describe('Project scanner reliability', () => {
  it('tracks repository root and env variable evidence without scanning comments as facts', async () => {
    const repo = await mkdtemp(path.join(os.tmpdir(), 'readme-doctor-'));

    try {
      await writeFile(path.join(repo, 'package.json'), JSON.stringify({
        name: 'scanner-fixture',
        scripts: {
          start: 'node src/index.js'
        }
      }));
      await writeFile(path.join(repo, 'README.md'), '# Scanner Fixture\n');
      await mkdir(path.join(repo, 'src'));
      await writeFile(path.join(repo, 'src', 'index.js'), [
        '// process.env.COMMENT_ONLY should not be detected',
        'const apiKey = process.env.REAL_API_KEY;',
        '/* process.env.BLOCK_COMMENT_ONLY should not be detected */'
      ].join('\n'));

      const context = await scanProject(repo);

      expect(context.rootPath).toBe(path.resolve(repo));
      expect(context.packageManager).toBe('npm');
      expect(context.projectTypes).toContain('Node.js');
      expect(context.envVariables).toEqual(['REAL_API_KEY']);
      expect(context.envVariableSources.REAL_API_KEY[0]).toMatchObject({
        file: path.join('src', 'index.js'),
        line: 2
      });
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });
});

describe('README parser evidence', () => {
  it('records line numbers for shell commands', () => {
    const context = parseReadme([
      '# Project',
      '',
      '```bash',
      'npm run dev',
      '```'
    ].join('\n'));

    expect(context.commands).toEqual(['npm run dev']);
    expect(context.commandDetails).toEqual([{ command: 'npm run dev', line: 4 }]);
  });
});
