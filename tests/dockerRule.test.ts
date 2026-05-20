import { describe, it, expect } from 'vitest';
import { DockerRule } from '../src/analyzers/rules/dockerRule.js';
import { ProjectContext, ReadmeContext } from '../src/core/types.js';

describe('DockerRule', () => {
  it('should flag undocumented Docker files when Docker files are present but not mentioned in README', async () => {
    const projectContext: ProjectContext = {
      projectName: 'docker-app',
      version: '1.0.0',
      description: 'A test project',
      scripts: {},
      dependencies: [],
      devDependencies: [],
      hasDocker: true, // has Dockerfile
      hasDockerCompose: true, // has docker-compose
      envVariables: [],
      envExampleVariables: [],
      files: ['Dockerfile', 'docker-compose.yml'],
      readmePath: 'README.md',
      readmeContent: '# My Containerized App\nThis app is great.'
    };

    const readmeContext: ReadmeContext = {
      sections: [],
      commands: []
    };

    const rule = new DockerRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('undocumented-docker');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('Dockerfile and docker-compose.yml');
    expect(issues[0].suggestion).toContain('docker-compose up');
  });

  it('should pass when Docker files are present and Docker is mentioned in README', async () => {
    const projectContext: ProjectContext = {
      projectName: 'docker-app',
      version: '1.0.0',
      description: 'A test project',
      scripts: {},
      dependencies: [],
      devDependencies: [],
      hasDocker: true,
      hasDockerCompose: false,
      envVariables: [],
      envExampleVariables: [],
      files: ['Dockerfile'],
      readmePath: 'README.md',
      readmeContent: '# Docker App\nRun it via `docker build -t app .`'
    };

    const readmeContext: ReadmeContext = {
      sections: [],
      commands: ['docker build -t app .']
    };

    const rule = new DockerRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(0);
  });
});
