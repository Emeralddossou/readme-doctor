import { describe, it, expect, vi } from 'vitest';
import { TranslationSyncRule } from '../src/analyzers/rules/translationSyncRule.js';
import { ProjectContext, ReadmeContext } from '../src/core/types.js';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('TranslationSyncRule', () => {
  it('should flag a warning when a translation file is missing standard sections present in main README', async () => {
    const projectContext: ProjectContext = {
      projectName: 'test',
      version: '1.0.0',
      description: 'test',
      scripts: {},
      dependencies: [],
      devDependencies: [],
      hasDocker: false,
      hasDockerCompose: false,
      envVariables: [],
      envExampleVariables: [],
      files: ['README.md', 'README.fr.md', 'index.js'],
      readmePath: 'README.md',
      readmeContent: '# Main Project\n## Installation\nnpm install\n## Usage\nnpm start'
    };

    const readmeContext: ReadmeContext = {
      sections: [
        { title: 'Main Project', level: 1, content: '' },
        { title: 'Installation', level: 2, content: 'npm install' },
        { title: 'Usage', level: 2, content: 'npm start' }
      ],
      commands: ['npm install', 'npm start']
    };

    // Mock README.fr.md file content to only contain Installation, missing Usage!
    vi.spyOn(fs, 'readFile').mockResolvedValue('# Projet\n## Installation\nnpm install');

    const rule = new TranslationSyncRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('desynchronized-translation:readme.fr.md:usage');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('README.fr.md');
    expect(issues[0].message).toContain('Usage');
  });

  it('should pass if translation file matches all sections of main README', async () => {
    const projectContext: ProjectContext = {
      projectName: 'test',
      version: '1.0.0',
      description: 'test',
      scripts: {},
      dependencies: [],
      devDependencies: [],
      hasDocker: false,
      hasDockerCompose: false,
      envVariables: [],
      envExampleVariables: [],
      files: ['README.md', 'README.es.md'],
      readmePath: 'README.md',
      readmeContent: '# Main Project\n## Installation\nnpm install\n## Usage\nnpm start'
    };

    const readmeContext: ReadmeContext = {
      sections: [
        { title: 'Main Project', level: 1, content: '' },
        { title: 'Installation', level: 2, content: 'npm install' },
        { title: 'Usage', level: 2, content: 'npm start' }
      ],
      commands: []
    };

    // Spanish translation has both Installation and Usage (as Uso)
    vi.spyOn(fs, 'readFile').mockResolvedValue('# Proyecto\n## Instalación\nnpm install\n## Uso\nnpm start');

    const rule = new TranslationSyncRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(0);
  });
});
