import { Issue, ProjectContext, ReadmeContext } from '../../core/types.js';

export interface Rule {
  id: string;
  name: string;
  description: string;
  run(projectContext: ProjectContext, readmeContext: ReadmeContext): Promise<Issue[]>;
}
