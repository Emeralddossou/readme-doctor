import { AnalysisReport, Issue, ProjectContext, ReadmeContext } from '../core/types.js';
import { ScriptRule } from './rules/scriptRule.js';
import { EnvRule } from './rules/envRule.js';
import { StructureRule } from './rules/structureRule.js';
import { DockerRule } from './rules/dockerRule.js';
import { LicenseRule } from './rules/licenseRule.js';
import { TranslationSyncRule } from './rules/translationSyncRule.js';
import { Rule } from './rules/baseRule.js';

const RULES: Rule[] = [
  new ScriptRule(),
  new EnvRule(),
  new StructureRule(),
  new DockerRule(),
  new LicenseRule(),
  new TranslationSyncRule()
];

/**
 * Calculates a documentation quality score based on detected issues.
 */
function calculateScore(issues: Issue[], hasReadme: boolean): number {
  if (!hasReadme) return 0;
  
  let score = 100;
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error':
        score -= 30;
        break;
      case 'warning':
        score -= 15;
        break;
      case 'info':
        score -= 5;
        break;
    }
  }
  return Math.max(0, Math.min(100, score));
}

/**
 * Orchestrates static analysis of the project.
 */
export async function analyzeProject(
  projectContext: ProjectContext,
  readmeContext: ReadmeContext
): Promise<AnalysisReport> {
  const issues: Issue[] = [];

  // Check if README exists
  const hasReadme = !!projectContext.readmePath;
  if (!hasReadme) {
    issues.push({
      id: 'missing-readme-file',
      severity: 'error',
      ruleName: 'Documentation Presence',
      message: 'README file is completely missing from the project root.',
      suggestion: 'Create a README.md file in your repository root to guide users on how to install, configure, and run the project.'
    });
  } else {
    // Run all analysis rules
    for (const rule of RULES) {
      try {
        const ruleIssues = await rule.run(projectContext, readmeContext);
        issues.push(...ruleIssues);
      } catch (err) {
        console.error(`Error running rule "${rule.name}":`, err);
      }
    }
  }

  const score = calculateScore(issues, hasReadme);

  return {
    projectName: projectContext.projectName,
    timestamp: new Date().toISOString(),
    issues,
    score,
    summary: null,
    suggestedReadme: null
  };
}
