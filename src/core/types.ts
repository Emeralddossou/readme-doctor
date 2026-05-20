export interface ProjectContext {
  projectName: string;
  version: string;
  description: string;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  hasDocker: boolean;
  hasDockerCompose: boolean;
  envVariables: string[];
  envExampleVariables: string[];
  files: string[];
  readmePath: string | null;
  readmeContent: string | null;
}

export interface ReadmeSection {
  title: string;
  level: number;
  content: string;
}

export interface ReadmeContext {
  sections: ReadmeSection[];
  commands: string[];
}

export type IssueSeverity = 'info' | 'warning' | 'error';

export interface Issue {
  id: string;
  severity: IssueSeverity;
  message: string;
  ruleName: string;
  suggestion: string;
}

export interface AnalysisReport {
  projectName: string;
  timestamp: string;
  issues: Issue[];
  score: number;
  summary: string | null;
  suggestedReadme: string | null;
}
