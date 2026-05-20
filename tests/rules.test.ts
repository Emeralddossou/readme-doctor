import { describe, it, expect } from 'vitest';
import { ScriptRule } from '../src/analyzers/rules/scriptRule.js';
import { EnvRule } from '../src/analyzers/rules/envRule.js';
import { ProjectContext, ReadmeContext } from '../src/core/types.js';

describe('ScriptRule', () => {
  it('should flag script commands recommended in README but missing from package.json', async () => {
    const projectContext: ProjectContext = {
      projectName: 'test',
      version: '1.0.0',
      description: 'test description',
      scripts: {
        start: 'node index.js',
        build: 'tsc'
      },
      dependencies: [],
      devDependencies: [],
      hasDocker: false,
      hasDockerCompose: false,
      envVariables: [],
      envExampleVariables: [],
      files: ['package.json'],
      readmePath: 'README.md',
      readmeContent: 'Run npm run dev'
    };

    const readmeContext: ReadmeContext = {
      sections: [],
      commands: ['npm run dev', 'npm run build']
    };

    const rule = new ScriptRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('missing-npm-script:dev');
    expect(issues[0].message).toContain('script "dev" is not defined');
  });

  it('should pass if all recommended scripts are defined', async () => {
    const projectContext: ProjectContext = {
      projectName: 'test',
      version: '1.0.0',
      description: 'test description',
      scripts: {
        dev: 'vite',
        start: 'node index.js',
        build: 'tsc'
      },
      dependencies: [],
      devDependencies: [],
      hasDocker: false,
      hasDockerCompose: false,
      envVariables: [],
      envExampleVariables: [],
      files: ['package.json'],
      readmePath: 'README.md',
      readmeContent: 'Run npm run dev'
    };

    const readmeContext: ReadmeContext = {
      sections: [],
      commands: ['npm run dev', 'npm run build']
    };

    const rule = new ScriptRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(0);
  });
});

describe('EnvRule', () => {
  it('should flag env variables used in code but not in .env.example', async () => {
    const projectContext: ProjectContext = {
      projectName: 'test',
      version: '1.0.0',
      description: 'test description',
      scripts: {},
      dependencies: [],
      devDependencies: [],
      hasDocker: false,
      hasDockerCompose: false,
      envVariables: ['DATABASE_PASSWORD', 'API_KEY'],
      envExampleVariables: ['API_KEY'],
      files: ['.env.example'],
      readmePath: 'README.md',
      readmeContent: 'Set DATABASE_PASSWORD and API_KEY'
    };

    const readmeContext: ReadmeContext = {
      sections: [],
      commands: []
    };

    const rule = new EnvRule();
    const issues = await rule.run(projectContext, readmeContext);

    // Should flag DATABASE_PASSWORD missing from .env.example
    const missingExample = issues.find(i => i.id.includes('missing-example'));
    expect(missingExample).toBeDefined();
    expect(missingExample?.message).toContain('DATABASE_PASSWORD');
  });

  it('should flag env variables in .env.example but not in README', async () => {
    const projectContext: ProjectContext = {
      projectName: 'test',
      version: '1.0.0',
      description: 'test description',
      scripts: {},
      dependencies: [],
      devDependencies: [],
      hasDocker: false,
      hasDockerCompose: false,
      envVariables: [],
      envExampleVariables: ['UNEXPLAINED_VAR'],
      files: ['.env.example'],
      readmePath: 'README.md',
      readmeContent: 'This is a clean README'
    };

    const readmeContext: ReadmeContext = {
      sections: [],
      commands: []
    };

    const rule = new EnvRule();
    const issues = await rule.run(projectContext, readmeContext);

    const missingReadme = issues.find(i => i.id.includes('missing-readme'));
    expect(missingReadme).toBeDefined();
    expect(missingReadme?.message).toContain('UNEXPLAINED_VAR');
  });
});
