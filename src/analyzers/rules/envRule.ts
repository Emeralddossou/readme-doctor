import { Issue, ProjectContext, ReadmeContext } from '../../core/types.js';
import { Rule } from './baseRule.js';

const IGNORED_ENV_VARS = new Set(['NODE_ENV', 'PORT', 'PATH', 'HOME', 'USER', 'PWD', 'VAR_NAME', 'VARIABLE_NAME', 'ENV_VAR', 'ENV_VARIABLE']);

export class EnvRule implements Rule {
  id = 'undocumented-env-var';
  name = 'Environment Variables Documentation';
  description = 'Ensures environment variables used in the codebase are declared in .env.example and documented in the README';

  async run(projectContext: ProjectContext, readmeContext: ReadmeContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    const readmeText = projectContext.readmeContent || '';
    const envVariableSources = projectContext.envVariableSources ?? {};
    
    // 1. Check env variables used in code vs .env.example
    for (const codeVar of projectContext.envVariables) {
      // Skip common standard Node/Deno environment variables to avoid noise
      if (IGNORED_ENV_VARS.has(codeVar)) {
        continue;
      }

      const inEnvExample = projectContext.envExampleVariables.includes(codeVar);
      if (!inEnvExample && projectContext.files.some(f => f.toLowerCase() === '.env.example')) {
        issues.push({
          id: `${this.id}:missing-example:${codeVar}`,
          severity: 'warning',
          ruleName: this.name,
          message: `Environment variable "${codeVar}" is used in the codebase but not declared in your ".env.example" file.`,
          suggestion: `Add "${codeVar}=" to your ".env.example" file to ensure other developers know this variable is required.`,
          confidence: 'high',
          fixType: 'config-file',
          evidence: envVariableSources[codeVar] ?? [
            {
              description: `Detected "${codeVar}" in source code.`
            }
          ]
        });
      }

      // Check if mentioned in README
      const escapedCodeVar = codeVar.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const codeVarRegex = new RegExp(`\\b${escapedCodeVar}\\b`, 'i');
      const mentionedInReadme = codeVarRegex.test(readmeText);
      if (!mentionedInReadme && readmeText) {
        issues.push({
          id: `${this.id}:missing-readme:${codeVar}`,
          severity: 'info',
          ruleName: this.name,
          message: `Environment variable "${codeVar}" is used in the codebase but not documented in your README.`,
          suggestion: `Add a section or reference in your README explaining what "${codeVar}" is used for and its expected values.`,
          confidence: 'high',
          fixType: 'readme-section',
          evidence: [
            ...(envVariableSources[codeVar] ?? []),
            {
              description: `README does not mention "${codeVar}".`,
              file: projectContext.readmePath ?? 'README'
            }
          ]
        });
      }
    }

    // 2. Check if .env.example variables are documented in the README
    for (const exampleVar of projectContext.envExampleVariables) {
      if (IGNORED_ENV_VARS.has(exampleVar)) {
        continue;
      }
      
      const escapedExampleVar = exampleVar.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const exampleVarRegex = new RegExp(`\\b${escapedExampleVar}\\b`, 'i');
      const mentionedInReadme = exampleVarRegex.test(readmeText);
      if (!mentionedInReadme && readmeText) {
        // Only add if not already added in step 1
        const alreadyAdded = issues.some(iss => iss.id === `${this.id}:missing-readme:${exampleVar}`);
        if (!alreadyAdded) {
          issues.push({
            id: `${this.id}:missing-readme-example:${exampleVar}`,
            severity: 'info',
            ruleName: this.name,
            message: `Environment variable "${exampleVar}" is declared in ".env.example" but not documented in your README.`,
            suggestion: `Document "${exampleVar}" in the configuration section of your README.`,
            confidence: 'high',
            fixType: 'readme-section',
            evidence: [
              {
                description: `Variable is declared in .env.example.`,
                file: '.env.example',
                excerpt: `${exampleVar}=`
              },
              {
                description: `README does not mention "${exampleVar}".`,
                file: projectContext.readmePath ?? 'README'
              }
            ]
          });
        }
      }
    }

    return issues;
  }
}
