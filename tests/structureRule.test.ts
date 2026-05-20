import { describe, it, expect } from 'vitest';
import { StructureRule } from '../src/analyzers/rules/structureRule.js';
import { ProjectContext, ReadmeContext } from '../src/core/types.js';

describe('StructureRule', () => {
  it('should flag missing Installation and Usage sections in README as warnings', async () => {
    const projectContext: ProjectContext = {
      projectName: 'test-app',
      version: '1.0.0',
      description: 'A test project',
      scripts: {},
      dependencies: [],
      devDependencies: [],
      hasDocker: false,
      hasDockerCompose: false,
      envVariables: [],
      envExampleVariables: [],
      files: [],
      readmePath: 'README.md',
      readmeContent: '# My Cool App\nThis is just a description.'
    };

    const readmeContext: ReadmeContext = {
      sections: [
        { title: 'My Cool App', level: 1, content: 'This is just a description.' }
      ],
      commands: []
    };

    const rule = new StructureRule();
    const issues = await rule.run(projectContext, readmeContext);

    // Should flag missing Installation and Usage
    const warnings = issues.filter(i => i.severity === 'warning');
    expect(warnings).toHaveLength(2);
    expect(warnings.some(i => i.id === 'missing-readme-section:installation')).toBe(true);
    expect(warnings.some(i => i.id === 'missing-readme-section:usage')).toBe(true);
    
    const instIssue = warnings.find(i => i.id === 'missing-readme-section:installation');
    expect(instIssue?.severity).toBe('warning');
  });

  it('should flag missing Configuration section as warning only if env variables exist', async () => {
    const projectContext: ProjectContext = {
      projectName: 'test-app',
      version: '1.0.0',
      description: 'A test project',
      scripts: {},
      dependencies: [],
      devDependencies: [],
      hasDocker: false,
      hasDockerCompose: false,
      envVariables: ['API_KEY'], // has env variables in code
      envExampleVariables: [],
      files: [],
      readmePath: 'README.md',
      readmeContent: '# My Cool App\n\n## Installation\nnpm install\n\n## Usage\nnpm start'
    };

    const readmeContext: ReadmeContext = {
      sections: [
        { title: 'My Cool App', level: 1, content: '' },
        { title: 'Installation', level: 2, content: 'npm install' },
        { title: 'Usage', level: 2, content: 'npm start' }
      ],
      commands: ['npm install', 'npm start']
    };

    const rule = new StructureRule();
    const issues = await rule.run(projectContext, readmeContext);

    // Should flag missing Configuration
    const warnings = issues.filter(i => i.severity === 'warning');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].id).toBe('missing-readme-section:configuration');
    expect(warnings[0].severity).toBe('warning');
  });

  it('should not flag missing sections when all standard sections are documented', async () => {
    const projectContext: ProjectContext = {
      projectName: 'test-app',
      version: '1.0.0',
      description: 'A test project',
      scripts: {},
      dependencies: [],
      devDependencies: [],
      hasDocker: false,
      hasDockerCompose: false,
      envVariables: ['API_KEY'],
      envExampleVariables: ['API_KEY'],
      files: ['.env.example'],
      readmePath: 'README.md',
      readmeContent: '# My Cool App\n\n## Installation\nnpm install\n\n## Usage\nnpm start\n\n## Configuration\nSet your API_KEY\n\n## Contributing\nSend PRs!\n\n## License\nMIT'
    };

    const readmeContext: ReadmeContext = {
      sections: [
        { title: 'My Cool App', level: 1, content: '' },
        { title: 'Installation', level: 2, content: 'npm install' },
        { title: 'Usage', level: 2, content: 'npm start' },
        { title: 'Configuration', level: 2, content: 'Set your API_KEY' },
        { title: 'Contributing', level: 2, content: 'Send PRs!' },
        { title: 'License', level: 2, content: 'MIT' }
      ],
      commands: []
    };

    const rule = new StructureRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(0);
  });
});
