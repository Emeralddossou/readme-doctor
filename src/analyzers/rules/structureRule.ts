import { Issue, ProjectContext, ReadmeContext } from '../../core/types.js';
import { Rule } from './baseRule.js';

interface SectionRequirement {
  name: string;
  aliases: string[];
  severity: 'warning' | 'info';
  description: string;
  suggestion: string;
  condition?: (projectContext: ProjectContext) => boolean;
}

export class StructureRule implements Rule {
  id = 'missing-readme-section';
  name = 'README Structure & Completeness';
  description = 'Ensures essential sections like Installation, Usage, Configuration, Contributing, and License are present';

  private requirements: SectionRequirement[] = [
    {
      name: 'Installation',
      aliases: ['installation', 'setup', 'get started', 'getting started', 'prerequisites', 'démarrage', 'configuration requise'],
      severity: 'warning',
      description: 'The README is missing a section explaining how to install and setup the project.',
      suggestion: 'Add an "Installation" section explaining step-by-step commands to get the project ready. For example:\n\n## Installation\n```bash\nnpm install\n```'
    },
    {
      name: 'Usage',
      aliases: ['usage', 'run', 'running', 'example', 'examples', 'utilisation', 'lancement', 'lancer', 'gameplay', 'jouer', 'development', 'développement', 'developpement', 'localement'],
      severity: 'warning',
      description: 'The README is missing a section explaining how to run or use the project.',
      suggestion: 'Add a "Usage" section with clear examples or command-line scripts to run the application. For example:\n\n## Usage\n```bash\nnpm start\n```'
    },
    {
      name: 'Configuration',
      aliases: ['config', 'configuration', 'environment', 'env', 'variables'],
      severity: 'warning',
      description: 'The project uses environment variables, but the README lacks a "Configuration" section.',
      suggestion: 'Add a "Configuration" section to document necessary environment variables and configuration files. For example:\n\n## Configuration\nCreate a `.env` file with:\n```env\nPORT=3000\n```',
      condition: (ctx) => ctx.envVariables.length > 0 || ctx.envExampleVariables.length > 0
    },
    {
      name: 'Contributing',
      aliases: ['contribute', 'contributing', 'contribution', 'contribuer'],
      severity: 'info',
      description: 'The README lacks a section on how other developers can contribute to this project.',
      suggestion: 'Add a "Contributing" section to invite pull requests and describe standard development workflows. For example:\n\n## Contributing\nContributions are welcome! Please open an issue or submit a pull request.'
    },
    {
      name: 'License',
      aliases: ['license', 'licence'],
      severity: 'info',
      description: 'The README does not explicitly mention the project license.',
      suggestion: 'Add a "License" section specifying the open source license of the project. For example:\n\n## License\nThis project is licensed under the MIT License.'
    }
  ];

  private getUsageSuggestion(projectContext: ProjectContext): string {
    const scripts = Object.keys(projectContext.scripts);
    if (projectContext.projectTypes?.includes('PHP')) {
      return 'Add a "Usage" or "Development" section with the actual local launch command. For example:\n\n## Usage\n```bash\nphp -S localhost:8000\n```';
    }

    if (scripts.includes('dev')) {
      return 'Add a "Usage" section with the project development command. For example:\n\n## Usage\n```bash\nnpm run dev\n```';
    }

    if (scripts.includes('start')) {
      return 'Add a "Usage" section with the project start command. For example:\n\n## Usage\n```bash\nnpm start\n```';
    }

    return 'Add a "Usage" section with clear examples or command-line scripts to run the application.';
  }

  async run(projectContext: ProjectContext, readmeContext: ReadmeContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    // Only run if a README exists
    if (!projectContext.readmeContent) {
      return [];
    }

    const sections = readmeContext.sections;

    for (const req of this.requirements) {
      // Check if requirement condition is met
      if (req.condition && !req.condition(projectContext)) {
        continue;
      }

      if (req.name === 'License' && /licen[csz]e|licence|licensed under|mit license|apache license|gpl|bsd/i.test(projectContext.readmeContent)) {
        continue;
      }

      // Check if any existing section matches the aliases
      const matches = sections.some(sec => {
        const titleLower = sec.title.toLowerCase();
        return req.aliases.some(alias => titleLower.includes(alias));
      });

      if (!matches) {
        issues.push({
          id: `${this.id}:${req.name.toLowerCase()}`,
          severity: req.severity,
          ruleName: this.name,
          message: req.description,
          suggestion: req.name === 'Usage' ? this.getUsageSuggestion(projectContext) : req.suggestion,
          confidence: 'medium',
          fixType: 'readme-section',
          evidence: [
            {
              description: `README headings found: ${sections.map(sec => sec.title).join(', ') || 'none'}.`,
              file: projectContext.readmePath ?? 'README'
            }
          ]
        });
      }
    }

    return issues;
  }
}
