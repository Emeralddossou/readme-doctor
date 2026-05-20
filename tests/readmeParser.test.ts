import { describe, it, expect } from 'vitest';
import { parseReadme } from '../src/scanners/readmeParser.js';

describe('readmeParser', () => {
  it('should split sections based on markdown headings', () => {
    const markdown = `
# Project Name
This is a cool project description.

## Installation
Run these commands to install:
\`\`\`bash
npm install
\`\`\`

## Configuration
Set these variables.
`;

    const context = parseReadme(markdown);
    
    expect(context.sections).toHaveLength(3);
    
    expect(context.sections[0].title).toBe('Project Name');
    expect(context.sections[0].level).toBe(1);
    expect(context.sections[0].content).toContain('This is a cool project description.');

    expect(context.sections[1].title).toBe('Installation');
    expect(context.sections[1].level).toBe(2);
    expect(context.sections[1].content).toContain('npm install');

    expect(context.sections[2].title).toBe('Configuration');
    expect(context.sections[2].level).toBe(2);
    expect(context.sections[2].content).toContain('Set these variables.');
  });

  it('should extract valid commands from shell code blocks', () => {
    const markdown = `
# Project
\`\`\`bash
npm run start
# This is a comment
docker-compose up
\`\`\`

Some intermediate text.

\`\`\`sh
yarn test
\`\`\`

\`\`\`json
{
  "key": "value"
}
\`\`\`
`;

    const context = parseReadme(markdown);
    
    expect(context.commands).toContain('npm run start');
    expect(context.commands).toContain('docker-compose up');
    expect(context.commands).toContain('yarn test');
    
    // Comments should not be extracted as commands
    expect(context.commands).not.toContain('# This is a comment');
    // JSON file contents should not be extracted as shell commands
    expect(context.commands).not.toContain('"key": "value"');
  });

  it('should handle null/empty content gracefully', () => {
    const context = parseReadme(null);
    expect(context.sections).toEqual([]);
    expect(context.commands).toEqual([]);
  });
});
