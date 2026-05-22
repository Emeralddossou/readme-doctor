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
    const envVariableOptional = projectContext.envVariableOptional ?? {};
    const hasEnvExample = projectContext.files.some(f => f.toLowerCase() === '.env.example');
    const missingExampleVars: string[] = [];
    const missingReadmeCodeVars: string[] = [];
    const missingReadmeExampleVars: string[] = [];
    const missingExampleEvidence: NonNullable<Issue['evidence']> = [];
    const missingReadmeCodeEvidence: NonNullable<Issue['evidence']> = [];
    const missingReadmeExampleEvidence: NonNullable<Issue['evidence']> = [];
    
    // 1. Check env variables used in code vs .env.example
    for (const codeVar of projectContext.envVariables) {
      // Skip common standard Node/Deno environment variables to avoid noise
      if (IGNORED_ENV_VARS.has(codeVar)) {
        continue;
      }

      const inEnvExample = projectContext.envExampleVariables.includes(codeVar);
      if (!inEnvExample && hasEnvExample && !envVariableOptional[codeVar]) {
        missingExampleVars.push(codeVar);
        missingExampleEvidence.push(...(envVariableSources[codeVar] ?? [{
          description: `Detected "${codeVar}" in source code.`
        }]));
      }

      // Check if mentioned in README
      const escapedCodeVar = codeVar.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const codeVarRegex = new RegExp(`\\b${escapedCodeVar}\\b`, 'i');
      const mentionedInReadme = codeVarRegex.test(readmeText);
      if (envVariableOptional[codeVar] && !inEnvExample) {
        continue;
      }
      if (!mentionedInReadme && readmeText) {
        missingReadmeCodeVars.push(codeVar);
        missingReadmeCodeEvidence.push(...(envVariableSources[codeVar] ?? []));
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
        const alreadyAdded = missingReadmeCodeVars.includes(exampleVar);
        if (!alreadyAdded) {
          missingReadmeExampleVars.push(exampleVar);
          missingReadmeExampleEvidence.push({
            description: `Variable "${exampleVar}" is declared in .env.example.`,
            file: '.env.example',
            excerpt: `${exampleVar}=`
          });
        }
      }
    }

    if (missingExampleVars.length > 0) {
      issues.push({
        id: `${this.id}:missing-example`,
        severity: 'warning',
        ruleName: this.name,
        message: `${missingExampleVars.length} required environment variable(s) are used in the codebase but missing from ".env.example": ${missingExampleVars.join(', ')}.`,
        suggestion: `Add these required variable(s) to ".env.example":\n\n${missingExampleVars.map(v => `${v}=`).join('\n')}`,
        confidence: 'high',
        fixType: 'config-file',
        evidence: missingExampleEvidence.slice(0, 10)
      });
    }

    if (missingReadmeCodeVars.length > 0) {
      issues.push({
        id: `${this.id}:missing-readme`,
        severity: 'info',
        ruleName: this.name,
        message: `${missingReadmeCodeVars.length} environment variable(s) are used in code but not documented in the README: ${missingReadmeCodeVars.join(', ')}.`,
        suggestion: `Document these variable(s) in the README configuration section: ${missingReadmeCodeVars.join(', ')}.`,
        confidence: 'high',
        fixType: 'readme-section',
        evidence: [
          ...missingReadmeCodeEvidence.slice(0, 10),
          {
            description: `README does not mention: ${missingReadmeCodeVars.join(', ')}.`,
            file: projectContext.readmePath ?? 'README'
          }
        ]
      });
    }

    if (missingReadmeExampleVars.length > 0) {
      issues.push({
        id: `${this.id}:missing-readme-example`,
        severity: 'info',
        ruleName: this.name,
        message: `${missingReadmeExampleVars.length} variable(s) declared in ".env.example" are not documented in the README: ${missingReadmeExampleVars.join(', ')}.`,
        suggestion: `Document these ".env.example" variable(s) in the README configuration section: ${missingReadmeExampleVars.join(', ')}.`,
        confidence: 'high',
        fixType: 'readme-section',
        evidence: [
          ...missingReadmeExampleEvidence.slice(0, 10),
          {
            description: `README does not mention: ${missingReadmeExampleVars.join(', ')}.`,
            file: projectContext.readmePath ?? 'README'
          }
        ]
      });
    }

    return issues;
  }
}
