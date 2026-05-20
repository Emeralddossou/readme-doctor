import fs from 'fs/promises';
import path from 'path';
import { ProjectContext } from '../core/types.js';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.vuepress', '.gemini']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.rb']);

/**
 * Recursively lists all files in a directory up to a max limit to avoid memory/loop issues.
 */
async function walkDir(dir: string, baseDir: string, maxFiles = 1000): Promise<string[]> {
  const result: string[] = [];
  let fileCount = 0;

  async function walk(currentDir: string) {
    if (fileCount >= maxFiles) return;

    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return; // Ignore inaccessible folders
    }

    for (const entry of entries) {
      if (fileCount >= maxFiles) break;

      const name = entry.name;
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(name)) continue;
        await walk(path.join(currentDir, name));
      } else if (entry.isFile()) {
        const relativePath = path.relative(baseDir, path.join(currentDir, name));
        result.push(relativePath);
        fileCount++;
      }
    }
  }

  await walk(dir);
  return result;
}

/**
 * Searches for README file case-insensitively in the root directory files.
 */
function findReadme(files: string[]): string | null {
  const rootFiles = files.filter(f => !f.includes(path.sep) && !f.includes('/'));
  
  // Prioritize exact match README.md
  const readmeMd = rootFiles.find(f => f.toLowerCase() === 'readme.md');
  if (readmeMd) return readmeMd;

  // Otherwise, find any file starting with readme
  const anyReadme = rootFiles.find(f => f.toLowerCase().startsWith('readme'));
  return anyReadme || null;
}

/**
 * Extract env variable keys from a .env.example file
 */
async function parseEnvExample(filePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const keys: string[] = [];
    const lines = content.split(/\r?\n/);
    
    // Match line starting with word characters and optional spaces followed by =
    // e.g. PORT=3000, DB_HOST=, export API_KEY="value"
    const regex = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/i;
    
    for (const line of lines) {
      const match = line.match(regex);
      if (match && match[1]) {
        keys.push(match[1]);
      }
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * Scans source files to detect usage of environment variables.
 */
async function scanEnvVariablesInCode(basePath: string, files: string[]): Promise<string[]> {
  const envVars = new Set<string>();
  
  // Regexes for different languages
  const regexes = [
    // JS/TS: process.env.VAR_NAME or process.env['VAR_NAME']
    /process\.env\.([A-Z_][A-Z0-9_]*)/g,
    /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    // Python: os.environ.get('VAR_NAME'), os.getenv('VAR_NAME'), os.environ['VAR_NAME']
    /os\.(?:environ(?:.get)?|getenv)\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
    // Go: os.Getenv("VAR_NAME")
    /os\.Getenv\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g
  ];

  // Only scan source files and limit to first 100 source files to keep it fast
  const sourceFiles = files
    .filter(f => SOURCE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .slice(0, 100);

  for (const file of sourceFiles) {
    try {
      const content = await fs.readFile(path.join(basePath, file), 'utf-8');
      
      for (const regex of regexes) {
        let match;
        // Reset regex index for safety
        regex.lastIndex = 0;
        while ((match = regex.exec(content)) !== null) {
          if (match[1]) {
            envVars.add(match[1]);
          }
        }
      }
    } catch {
      // Ignore reading errors
    }
  }

  return Array.from(envVars);
}

/**
 * Main function to scan a local repository and collect context.
 */
export async function scanProject(projectPath: string): Promise<ProjectContext> {
  const resolvedPath = path.resolve(projectPath);
  const files = await walkDir(resolvedPath, resolvedPath);
  
  let projectName = path.basename(resolvedPath);
  let version = '1.0.0';
  let description = '';
  let scripts: Record<string, string> = {};
  let dependencies: string[] = [];
  let devDependencies: string[] = [];

  // Parse package.json if it exists
  const hasPackageJson = files.includes('package.json');
  if (hasPackageJson) {
    try {
      const content = await fs.readFile(path.join(resolvedPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(content);
      
      if (pkg.name) projectName = pkg.name;
      if (pkg.version) version = pkg.version;
      if (pkg.description) description = pkg.description;
      if (pkg.scripts) scripts = pkg.scripts;
      if (pkg.dependencies) dependencies = Object.keys(pkg.dependencies);
      if (pkg.devDependencies) devDependencies = Object.keys(pkg.devDependencies);
    } catch {
      // package.json parsing failed, fallback to defaults
    }
  }

  const hasDocker = files.includes('Dockerfile') || files.some(f => f.endsWith('/Dockerfile'));
  const hasDockerCompose = files.some(f => f.toLowerCase().includes('docker-compose'));

  // Env variables
  const envExamplePath = files.find(f => f.toLowerCase() === '.env.example');
  const envExampleVariables = envExamplePath 
    ? await parseEnvExample(path.join(resolvedPath, envExamplePath)) 
    : [];

  const envVariables = await scanEnvVariablesInCode(resolvedPath, files);

  // Readme
  const readmePath = findReadme(files);
  let readmeContent: string | null = null;
  if (readmePath) {
    try {
      readmeContent = await fs.readFile(path.join(resolvedPath, readmePath), 'utf-8');
    } catch {
      // Failed to read readme
    }
  }

  return {
    projectName,
    version,
    description,
    scripts,
    dependencies,
    devDependencies,
    hasDocker,
    hasDockerCompose,
    envVariables,
    envExampleVariables,
    files,
    readmePath,
    readmeContent
  };
}
