import { Issue, ProjectContext, ReadmeContext } from '../../core/types.js';
import { Rule } from './baseRule.js';

const SKIP_SUBCOMMANDS = new Set([
  'install', 'i', 'add', 'remove', 'init', 'publish', 
  'run', 'build', 'test', 'start', 'config', 'info', 
  'why', 'create', 'global', 'link', 'unlink'
]);

export class ScriptRule implements Rule {
  id = 'missing-npm-script';
  name = 'NPM Scripts Consistency';
  description = 'Verifies if npm/yarn/pnpm/bun scripts suggested in the README are defined in package.json';

  async run(projectContext: ProjectContext, readmeContext: ReadmeContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    const definedScripts = Object.keys(projectContext.scripts);
    
    // Only run if the project has a package.json (indicated by defined scripts)
    if (projectContext.files.includes('package.json')) {
      const checkedScripts = new Set<string>();

      // Extract script invocations from commands
      for (const command of readmeContext.commands) {
        // Match: npm run <script>, yarn <script>, pnpm <script>, bun run <script>
        const matches = [
          command.match(/npm\s+run\s+([a-zA-Z0-9:_-]+)/),
          command.match(/yarn\s+(?:run\s+)?([a-zA-Z0-9:_-]+)/),
          command.match(/pnpm\s+(?:run\s+)?([a-zA-Z0-9:_-]+)/),
          command.match(/bun\s+(?:run\s+)?([a-zA-Z0-9:_-]+)/)
        ];

        for (const match of matches) {
          if (match && match[1]) {
            const scriptName = match[1];
            
            // Skip common build-in package manager commands
            if (SKIP_SUBCOMMANDS.has(scriptName)) {
              continue;
            }
            
            if (checkedScripts.has(scriptName)) {
              continue;
            }
            checkedScripts.add(scriptName);

            // Check if the script is defined in package.json
            if (!definedScripts.includes(scriptName)) {
              issues.push({
                id: `${this.id}:${scriptName}`,
                severity: 'warning',
                ruleName: this.name,
                message: `The README suggests running "${command}", but the script "${scriptName}" is not defined in your package.json.`,
                suggestion: `Add the "${scriptName}" script to the "scripts" object in package.json, or update the README to use a valid script (available: ${definedScripts.join(', ') || 'none'}).`
              });
            }
          }
        }
      }
    }

    return issues;
  }
}
