import { AnalysisReport, ProjectContext } from '../core/types.js';

function getInstallCommand(context: ProjectContext): string | null {
  switch (context.packageManager) {
    case 'pnpm':
      return 'pnpm install';
    case 'yarn':
      return 'yarn install';
    case 'bun':
      return 'bun install';
    case 'npm':
      return 'npm install';
    default:
      if (context.projectTypes.includes('Rust')) return 'cargo build';
      if (context.projectTypes.includes('Go')) return 'go mod download';
      if (context.projectTypes.includes('Python')) return 'pip install -r requirements.txt';
      if (context.projectTypes.includes('PHP')) return 'composer install';
      if (context.projectTypes.includes('Java/Maven')) return 'mvn install';
      if (context.projectTypes.includes('Ruby')) return 'bundle install';
      return null;
  }
}

function formatScriptCommand(context: ProjectContext, scriptName: string): string {
  const manager = context.packageManager ?? 'npm';
  if (manager === 'yarn') return `yarn ${scriptName}`;
  if (manager === 'pnpm') return `pnpm ${scriptName}`;
  if (manager === 'bun') return `bun run ${scriptName}`;
  if (['start', 'test', 'restart', 'stop'].includes(scriptName)) return `npm ${scriptName}`;
  return `npm run ${scriptName}`;
}

function selectUsageCommands(context: ProjectContext): string[] {
  const preferred = ['dev', 'start', 'serve', 'build', 'test'];
  const scripts = Object.keys(context.scripts);
  const selected = preferred.filter(name => scripts.includes(name));

  if (selected.length > 0) {
    return selected.map(script => formatScriptCommand(context, script));
  }

  if (context.projectTypes.includes('Rust')) return ['cargo run', 'cargo test'];
  if (context.projectTypes.includes('Go')) return ['go run .', 'go test ./...'];
  if (context.projectTypes.includes('Python')) return ['python -m main', 'pytest'];
  if (context.projectTypes.includes('PHP')) return ['php -S localhost:8000 -t public'];
  if (context.projectTypes.includes('Java/Maven')) return ['mvn test'];
  if (context.projectTypes.includes('Ruby')) return ['bundle exec ruby app.rb'];
  return [];
}

export function generateLocalSummary(context: ProjectContext): string {
  const types = context.projectTypes.length > 0 ? context.projectTypes.join(', ') : 'general software';
  const description = context.description || `A ${types} project named ${context.projectName}.`;
  const scripts = Object.keys(context.scripts);
  const documentedOrRequiredEnvVars = Array.from(new Set([
    ...context.envExampleVariables,
    ...context.envVariables.filter(envVar => !context.envVariableOptional?.[envVar] || context.envExampleVariables.includes(envVar))
  ])).sort();
  const scriptText = scripts.length > 0
    ? ` It exposes ${scripts.length} workflow command(s): ${scripts.join(', ')}.`
    : '';
  const dockerText = context.hasDocker || context.hasDockerCompose
    ? ' Docker support is present in the repository.'
    : '';
  const envText = documentedOrRequiredEnvVars.length > 0
    ? ` It uses environment configuration (${documentedOrRequiredEnvVars.join(', ')}).`
    : '';

  return `${description} Detected project type: ${types}.${scriptText}${dockerText}${envText}`.trim();
}

export function generateLocalReadme(context: ProjectContext): string {
  const lines: string[] = [];
  const installCommand = getInstallCommand(context);
  const usageCommands = selectUsageCommands(context);
  const envVars = Array.from(new Set([
    ...context.envExampleVariables,
    ...context.envVariables.filter(envVar => !context.envVariableOptional?.[envVar] || context.envExampleVariables.includes(envVar))
  ])).sort();

  lines.push(`# ${context.projectName}`);
  lines.push('');
  lines.push(context.description || generateLocalSummary(context));
  lines.push('');

  if (context.projectTypes.length > 0) {
    lines.push('## Tech Stack');
    lines.push('');
    for (const type of context.projectTypes) {
      lines.push(`- ${type}`);
    }
    lines.push('');
  }

  if (installCommand) {
    lines.push('## Installation');
    lines.push('');
    lines.push('```bash');
    lines.push(installCommand);
    lines.push('```');
    lines.push('');
  }

  if (envVars.length > 0) {
    lines.push('## Configuration');
    lines.push('');
    lines.push('Create a `.env` file and define the required variables:');
    lines.push('');
    lines.push('```env');
    for (const envVar of envVars) {
      lines.push(`${envVar}=`);
    }
    lines.push('```');
    lines.push('');
  }

  if (usageCommands.length > 0) {
    lines.push('## Usage');
    lines.push('');
    lines.push('```bash');
    for (const command of usageCommands) {
      lines.push(command);
    }
    lines.push('```');
    lines.push('');
  }

  if (context.hasDocker || context.hasDockerCompose) {
    lines.push('## Docker');
    lines.push('');
    lines.push('```bash');
    if (context.hasDockerCompose) {
      lines.push('docker-compose up --build');
    } else {
      lines.push(`docker build -t ${context.projectName} .`);
      lines.push(`docker run ${context.projectName}`);
    }
    lines.push('```');
    lines.push('');
  }

  lines.push('## Contributing');
  lines.push('');
  lines.push('Contributions are welcome. Open an issue or submit a pull request with a clear description of the change.');
  lines.push('');
  lines.push('## License');
  lines.push('');
  lines.push('See the repository license file for details.');
  lines.push('');

  return lines.join('\n');
}

export function generateLocalFixes(report: AnalysisReport): string {
  if (report.issues.length === 0) {
    return 'No README issues were detected by the local rules.';
  }

  const lines = ['# Suggested README Fixes', ''];
  for (const issue of report.issues) {
    lines.push(`## ${issue.ruleName}`);
    lines.push('');
    lines.push(issue.message);
    lines.push('');
    if (issue.evidence && issue.evidence.length > 0) {
      lines.push('Evidence:');
      for (const evidence of issue.evidence) {
        const location = evidence.file ? ` (${evidence.file}${evidence.line ? `:${evidence.line}` : ''})` : '';
        lines.push(`- ${evidence.description}${location}`);
      }
      lines.push('');
    }
    lines.push(issue.suggestion);
    lines.push('');
  }

  return lines.join('\n');
}
