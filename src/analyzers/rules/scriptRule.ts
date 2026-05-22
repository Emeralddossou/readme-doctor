import { Issue, ProjectContext, ReadmeContext } from '../../core/types.js';
import { Rule } from './baseRule.js';

const SKIP_SUBCOMMANDS = new Set([
  'install', 'i', 'add', 'remove', 'rm', 'init', 'publish',
  'run', 'config', 'info',
  'why', 'create', 'global', 'link', 'unlink'
]);

const NPM_SCRIPT_SHORTCUTS = new Set(['start', 'test', 'restart', 'stop']);

interface ScriptReference {
  command: string;
  scriptName: string;
  line?: number;
}

export class ScriptRule implements Rule {
  id = 'missing-npm-script';
  name = 'NPM Scripts Consistency';
  description = 'Verifies if npm/yarn/pnpm/bun scripts suggested in the README are defined in package.json';

  private extractScriptReferences(readmeContext: ReadmeContext): ScriptReference[] {
    const commandDetails = readmeContext.commandDetails ?? readmeContext.commands.map(command => ({ command, line: undefined }));
    const refs: ScriptReference[] = [];

    for (const detail of commandDetails) {
      const command = detail.command.trim();
      const npmRun = command.match(/\bnpm\s+run\s+([a-zA-Z0-9:_-]+)/);
      if (npmRun?.[1]) {
        refs.push({ command, scriptName: npmRun[1], line: detail.line });
        continue;
      }

      const npmShortcut = command.match(/\bnpm\s+([a-zA-Z0-9:_-]+)/);
      if (npmShortcut?.[1] && NPM_SCRIPT_SHORTCUTS.has(npmShortcut[1])) {
        refs.push({ command, scriptName: npmShortcut[1], line: detail.line });
        continue;
      }

      const packageManagerScript = command.match(/\b(?:yarn|pnpm|bun)\s+(?:run\s+)?([a-zA-Z0-9:_-]+)/);
      if (packageManagerScript?.[1]) {
        const scriptName = packageManagerScript[1];
        if (!SKIP_SUBCOMMANDS.has(scriptName)) {
          refs.push({ command, scriptName, line: detail.line });
        }
      }
    }

    return refs;
  }

  async run(projectContext: ProjectContext, readmeContext: ReadmeContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    const definedScripts = Object.keys(projectContext.scripts);
    
    // Only run if the project has a package.json (indicated by defined scripts)
    if (projectContext.files.includes('package.json')) {
      const checkedScripts = new Set<string>();

      for (const ref of this.extractScriptReferences(readmeContext)) {
        if (checkedScripts.has(ref.scriptName)) {
          continue;
        }
        checkedScripts.add(ref.scriptName);

        // Check if the script is defined in package.json
        if (!definedScripts.includes(ref.scriptName)) {
          issues.push({
            id: `${this.id}:${ref.scriptName}`,
            severity: 'warning',
            ruleName: this.name,
            message: `The README suggests running "${ref.command}", but the script "${ref.scriptName}" is not defined in your package.json.`,
            suggestion: `Add the "${ref.scriptName}" script to the "scripts" object in package.json, or update the README to use a valid script (available: ${definedScripts.join(', ') || 'none'}).`,
            confidence: 'high',
            fixType: 'readme-command',
            evidence: [
              {
                description: `README command references package script "${ref.scriptName}".`,
                file: projectContext.readmePath ?? 'README',
                line: ref.line,
                excerpt: ref.command
              },
              {
                description: `Available package.json scripts: ${definedScripts.join(', ') || 'none'}.`,
                file: 'package.json'
              }
            ]
          });
        }
      }
    }

    return issues;
  }
}
