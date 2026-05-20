import { describe, it, expect, vi } from 'vitest';
import { LicenseRule } from '../src/analyzers/rules/licenseRule.js';
import { ProjectContext, ReadmeContext } from '../src/core/types.js';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('LicenseRule', () => {
  it('should flag warning when a license file is present but license is not mentioned in README', async () => {
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
      files: ['LICENSE', 'index.js', 'package.json'],
      readmePath: 'README.md',
      readmeContent: '# Test Project\nJust a test description.'
    };

    const readmeContext: ReadmeContext = {
      sections: [{ title: 'Test Project', level: 1, content: 'Just a test description.' }],
      commands: []
    };

    // Mock fs.readFile to return simple MIT text
    vi.spyOn(fs, 'readFile').mockResolvedValue('MIT License\nAll rights reserved.');

    const rule = new LicenseRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('undocumented-license');
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toContain('LICENSE');
    expect(issues[0].suggestion).toContain('MIT License');
  });

  it('should pass if a license file is present and is mentioned in README', async () => {
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
      files: ['LICENSE', 'index.js'],
      readmePath: 'README.md',
      readmeContent: '# Test Project\n## License\nLicensed under MIT.'
    };

    const readmeContext: ReadmeContext = {
      sections: [
        { title: 'Test Project', level: 1, content: '' },
        { title: 'License', level: 2, content: 'Licensed under MIT.' }
      ],
      commands: []
    };

    const rule = new LicenseRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(0);
  });

  it('should suggest adding a license file if none exists and README has no license section', async () => {
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
      files: ['index.js'],
      readmePath: 'README.md',
      readmeContent: '# Test Project\nNo licence mention.'
    };

    const readmeContext: ReadmeContext = {
      sections: [{ title: 'Test Project', level: 1, content: 'No licence mention.' }],
      commands: []
    };

    const rule = new LicenseRule();
    const issues = await rule.run(projectContext, readmeContext);

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('undocumented-license:missing-file');
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toContain('No license file was detected');
  });
});
