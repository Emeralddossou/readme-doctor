import { Issue, ProjectContext, ReadmeContext } from '../../core/types.js';
import { Rule } from './baseRule.js';

export class DockerRule implements Rule {
  id = 'undocumented-docker';
  name = 'Docker Documentation Consistency';
  description = 'Ensures that Docker files (Dockerfile or docker-compose.yml) present in the repository are documented in the README';

  async run(projectContext: ProjectContext, readmeContext: ReadmeContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    const hasDocker = projectContext.hasDocker || projectContext.hasDockerCompose;
    const readmeText = projectContext.readmeContent || '';

    // If Docker files are present but README exists and does not mention Docker
    if (hasDocker && readmeText) {
      const mentionsDocker = /docker/i.test(readmeText);

      if (!mentionsDocker) {
        let dockerType = 'Docker setup';
        let suggestedCommands = '';

        if (projectContext.hasDocker && projectContext.hasDockerCompose) {
          dockerType = 'Dockerfile and docker-compose.yml';
          suggestedCommands = '### Run with Docker Compose\n```bash\ndocker-compose up --build\n```\n\n### Run with Docker\n```bash\ndocker build -t my-app .\ndocker run -p 3000:3000 my-app\n```';
        } else if (projectContext.hasDockerCompose) {
          dockerType = 'docker-compose.yml';
          suggestedCommands = '### Run with Docker Compose\n```bash\ndocker-compose up\n```';
        } else {
          dockerType = 'Dockerfile';
          suggestedCommands = '### Run with Docker\n```bash\ndocker build -t my-app .\ndocker run -p 3000:3000 my-app\n```';
        }

        issues.push({
          id: this.id,
          severity: 'warning',
          ruleName: this.name,
          message: `Docker files (${dockerType}) are present in your codebase, but Docker is not documented in the README.`,
          suggestion: `Add a "Docker" or "Deployment" section to explain how developers can run the application containerized. Example:\n\n## Docker Setup\n${suggestedCommands}`,
          confidence: 'high',
          fixType: 'readme-section',
          evidence: [
            ...projectContext.files
              .filter(file => file === 'Dockerfile' || file.endsWith('/Dockerfile') || file.toLowerCase().includes('docker-compose'))
              .map(file => ({
                description: 'Docker-related file detected.',
                file
              })),
            {
              description: 'README does not mention Docker.',
              file: projectContext.readmePath ?? 'README'
            }
          ]
        });
      }
    }

    return issues;
  }
}
