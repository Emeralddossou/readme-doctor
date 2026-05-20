import { ProjectContext } from '../core/types.js';

export function getSummaryPrompt(context: ProjectContext): string {
  return `
You are an expert developer auditing a repository named "${context.projectName}".
Your task is to generate a concise, professional summary of this project.

Here is the context about the project:
- Name: ${context.projectName}
- Version: ${context.version}
- Description: ${context.description || 'No description provided.'}
- Scripts: ${JSON.stringify(context.scripts, null, 2)}
- Dependencies: ${context.dependencies.join(', ') || 'None'}
- DevDependencies: ${context.devDependencies.join(', ') || 'None'}
- Docker: ${context.hasDocker ? 'Yes (Dockerfile present)' : 'No'}
- Docker Compose: ${context.hasDockerCompose ? 'Yes (docker-compose present)' : 'No'}
- Detected Env Variables: ${context.envVariables.join(', ') || 'None'}
- Declared Env Example Variables: ${context.envExampleVariables.join(', ') || 'None'}
- Top 50 Files in repository:
${context.files.slice(0, 50).map(f => `  - ${f}`).join('\n')}

Instructions:
1. Write a 3-4 sentence high-level summary explaining what this project does, who it is for, and its primary purpose.
2. Under a "Key Technologies" header, list the main languages, frameworks, and tools used in this repository.
3. Be direct, professional, and factual. Do not make up features or facts not supported by the file structure or scripts.
`;
}

export function getFixesPrompt(context: ProjectContext, issuesJson: string): string {
  return `
You are an expert technical writer and developer auditing the README.md of a repository named "${context.projectName}".
Your task is to suggest concrete fixes to resolve documented consistency issues in the README.

Here are the issues detected:
${issuesJson}

Here is the current README content:
"""
${context.readmeContent || '(README is empty or missing)'}
"""

Here is the project context:
- Scripts: ${JSON.stringify(context.scripts, null, 2)}
- Docker: ${context.hasDocker ? 'Yes' : 'No'}
- Docker Compose: ${context.hasDockerCompose ? 'Yes' : 'No'}
- Env Variables used in code: ${context.envVariables.join(', ') || 'None'}
- Env variables in .env.example: ${context.envExampleVariables.join(', ') || 'None'}

Instructions:
1. For each issue in the list, provide a brief, extremely clear explanation of how to fix it.
2. Provide the exact text changes (as Markdown code snippets or diffs) that the developer should apply to their README.md.
3. Do not make any assumptions or invent new features. Keep your suggestions strict and focused on correcting the listed issues.
`;
}

export function getReadmePrompt(context: ProjectContext): string {
  return `
You are an expert open-source maintainer. Your task is to generate a premium, state-of-the-art README.md for the project "${context.projectName}".
The README must feel premium, modern, well-structured, and highly useful to both newcomers and advanced users.

Here is the project context:
- Name: ${context.projectName}
- Version: ${context.version}
- Description: ${context.description || 'No description provided.'}
- Scripts: ${JSON.stringify(context.scripts, null, 2)}
- Dependencies: ${context.dependencies.join(', ') || 'None'}
- DevDependencies: ${context.devDependencies.join(', ') || 'None'}
- Docker: ${context.hasDocker ? 'Yes' : 'No'}
- Docker Compose: ${context.hasDockerCompose ? 'Yes' : 'No'}
- Detected Env Variables: ${context.envVariables.join(', ') || 'None'}
- Declared Env Example Variables: ${context.envExampleVariables.join(', ') || 'None'}
- Files in repository:
${context.files.slice(0, 50).map(f => `  - ${f}`).join('\n')}

Instructions:
1. Create a complete, production-ready README.md file in Markdown.
2. Include the following sections:
   - **Header**: Project name, brief beautiful subtitle, and clean features checklist.
   - **Prerequisites**: What is required (Node.js version, Docker, etc.).
   - **Installation**: Exact commands to clone, install dependencies, and setup.
   - **Configuration**: List of environment variables (from the detected variables or .env.example) with short descriptions of their purpose.
   - **Usage**: Standard usage commands (e.g., start, dev, test) using the exact scripts found in the package.json.
   - **Docker** (if Docker is present): How to run the project using Docker or Docker Compose.
   - **Contributing**: Standard brief contributing guide.
   - **License**: State the license (default to MIT or the license found in package.json).
 3. Do not use generic placeholders. Use the actual commands and structure of the repository. Make sure all code blocks are properly highlighted (e.g., \`\`\`bash or \`\`\`typescript).
`;
}

export function getTranslationPrompt(readmeContent: string, targetLang: string): string {
  return `
You are an expert technical translator. Your task is to translate the following README.md content faithfully, accurately, and professionally into the target language "${targetLang}".

Here is the README content to translate:
"""
${readmeContent}
"""

Instructions:
1. Translate all explanatory text, headers, and descriptions into "${targetLang}".
2. Do NOT translate command-line scripts, configuration variable names (like environment variables), or code block contents. They must remain exactly as they are.
3. Maintain all Markdown syntax, structural elements, links, and emojis exactly as in the original.
4. Output only the translated Markdown text. Do not wrap it in conversational introductions or conclusions.
`;
}
