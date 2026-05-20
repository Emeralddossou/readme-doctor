import { ProjectContext } from '../core/types.js';

export interface IAProvider {
  name: string;
  generateSummary(context: ProjectContext): Promise<string>;
  suggestFixes(context: ProjectContext, issuesJson: string): Promise<string>;
  generateReadme(context: ProjectContext): Promise<string>;
  translateReadme(readmeContent: string, targetLang: string): Promise<string>;
}
