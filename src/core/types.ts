export interface ProjectContext {
  rootPath: string;
  projectName: string;
  version: string;
  description: string;
  packageManager: string | null;
  projectTypes: string[];
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  hasDocker: boolean;
  hasDockerCompose: boolean;
  envVariables: string[];
  envVariableSources: Record<string, IssueEvidence[]>;
  envVariableOptional: Record<string, boolean>;
  envExampleVariables: string[];
  files: string[];
  readmePath: string | null;
  readmeContent: string | null;
}

export interface IssueEvidence {
  description: string;
  file?: string;
  line?: number;
  excerpt?: string;
}

export interface ReadmeSection {
  title: string;
  level: number;
  content: string;
  line?: number;
}

export interface ReadmeCommand {
  command: string;
  line: number;
}

export interface ReadmeContext {
  sections: ReadmeSection[];
  commands: string[];
  commandDetails?: ReadmeCommand[];
}

export type IssueSeverity = 'info' | 'warning' | 'error';
export type IssueConfidence = 'low' | 'medium' | 'high';

export interface Issue {
  id: string;
  severity: IssueSeverity;
  message: string;
  ruleName: string;
  suggestion: string;
  confidence?: IssueConfidence;
  fixType?: 'manual' | 'readme-section' | 'readme-command' | 'config-file' | 'generated';
  evidence?: IssueEvidence[];
}

export interface AnalysisReport {
  projectName: string;
  timestamp: string;
  issues: Issue[];
  score: number;
  summary: string | null;
  suggestedReadme: string | null;
}
