import fs from 'fs/promises';
import path from 'path';
import { IssueEvidence, ProjectContext } from '../core/types.js';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.vuepress', '.gemini']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.php']);
const PLACEHOLDER_ENV_NAMES = new Set(['VAR_NAME', 'VARIABLE_NAME', 'ENV_VAR', 'ENV_VARIABLE', 'YOUR_API_KEY', 'YOUR_TOKEN']);

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
      entries.sort((a, b) => a.name.localeCompare(b.name));
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

function detectPackageManager(files: string[]): string | null {
  if (files.includes('pnpm-lock.yaml')) return 'pnpm';
  if (files.includes('yarn.lock')) return 'yarn';
  if (files.includes('bun.lockb') || files.includes('bun.lock')) return 'bun';
  if (files.includes('package-lock.json') || files.includes('npm-shrinkwrap.json')) return 'npm';
  if (files.includes('package.json')) return 'npm';
  return null;
}

function stripCommentsForEnvScan(line: string, ext: string, state: { inBlockComment: boolean }): string {
  let output = line;

  if (['.ts', '.js', '.tsx', '.jsx', '.go', '.rs', '.java', '.php'].includes(ext)) {
    if (state.inBlockComment) {
      const end = output.indexOf('*/');
      if (end === -1) return '';
      output = output.slice(end + 2);
      state.inBlockComment = false;
    }

    while (output.includes('/*')) {
      const start = output.indexOf('/*');
      const end = output.indexOf('*/', start + 2);
      if (end === -1) {
        output = output.slice(0, start);
        state.inBlockComment = true;
        break;
      }
      output = output.slice(0, start) + output.slice(end + 2);
    }

    const lineComment = output.indexOf('//');
    if (lineComment !== -1) {
      output = output.slice(0, lineComment);
    }
  }

  if (['.py', '.rb', '.php'].includes(ext)) {
    const hashComment = output.indexOf('#');
    if (hashComment !== -1) {
      output = output.slice(0, hashComment);
    }
  }

  return output;
}

function isLikelyTestFile(file: string): boolean {
  const normalized = file.replace(/\\/g, '/').toLowerCase();
  return normalized.includes('/test/')
    || normalized.includes('/tests/')
    || normalized.includes('/__tests__/')
    || /\.(test|spec)\.[a-z0-9]+$/.test(normalized);
}

function hasPhpApplicationFiles(files: string[]): boolean {
  return files.some(file => path.extname(file).toLowerCase() === '.php');
}

function hasPhpUnitTests(files: string[]): boolean {
  return files.some(file => file.replace(/\\/g, '/').toLowerCase().includes('tests/')
    && path.extname(file).toLowerCase() === '.php');
}

function isEnvReferenceOptional(line: string, variableName: string): boolean {
  const escaped = variableName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const functionWithDefault = new RegExp(`\\b(?:env|env_get|getenv)\\s*\\(\\s*['"]${escaped}['"]\\s*,`);
  if (functionWithDefault.test(line)) return true;

  const nullCoalescing = new RegExp(`(?:process\\.env\\.${escaped}|process\\.env\\[['"]${escaped}['"]\\]|\\$_ENV\\[['"]${escaped}['"]\\])\\s*\\?\\?`);
  return nullCoalescing.test(line);
}

/**
 * Scans source files to detect usage of environment variables.
 */
async function scanEnvVariablesInCode(basePath: string, files: string[]): Promise<{ variables: string[], sources: Record<string, IssueEvidence[]>, optional: Record<string, boolean> }> {
  const envVars = new Set<string>();
  const sources: Record<string, IssueEvidence[]> = {};
  const optional: Record<string, boolean> = {};
  
  // Regexes for different languages
  const regexes = [
    // JS/TS: process.env.VAR_NAME or process.env['VAR_NAME']
    /process\.env\.([A-Z_][A-Z0-9_]*)/g,
    /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    // Python: os.environ.get('VAR_NAME'), os.getenv('VAR_NAME'), os.environ['VAR_NAME']
    /os\.(?:environ(?:.get)?|getenv)\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
    // Go: os.Getenv("VAR_NAME")
    /os\.Getenv\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
    // PHP config env access. $_SERVER is intentionally excluded: it contains HTTP/request metadata, not .env config.
    /getenv\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
    /\$_ENV\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    /env\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
    /env_get\(['"]([A-Z_][A-Z0-9_]*)['"]/g,
    // Ruby: ENV['VAR_NAME'] or ENV.fetch('VAR_NAME')
    /ENV\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    /ENV\.fetch\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
    // Rust: std::env::var("VAR_NAME") or env::var("VAR_NAME")
    /env::var\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
    // Java: System.getenv("VAR_NAME")
    /System\.getenv\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g
  ];

  // Only scan source files and limit to first 100 source files to keep it fast
  const sourceFiles = files
    .filter(f => SOURCE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .filter(f => !isLikelyTestFile(f))
    .slice(0, 100);

  for (const file of sourceFiles) {
    try {
      const content = await fs.readFile(path.join(basePath, file), 'utf-8');
      const ext = path.extname(file).toLowerCase();
      const lines = content.split(/\r?\n/);
      const commentState = { inBlockComment: false };

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const originalLine = lines[lineIndex];
        const codeLine = stripCommentsForEnvScan(originalLine, ext, commentState);

        for (const regex of regexes) {
          let match;
          // Reset regex index for safety
          regex.lastIndex = 0;
          while ((match = regex.exec(codeLine)) !== null) {
            const variableName = match[1];
            if (variableName && !PLACEHOLDER_ENV_NAMES.has(variableName)) {
              envVars.add(variableName);
              optional[variableName] = (optional[variableName] ?? true) && isEnvReferenceOptional(codeLine, variableName);
              sources[variableName] ??= [];
              if (sources[variableName].length < 5) {
                sources[variableName].push({
                  description: `Detected environment variable "${variableName}" in source code.`,
                  file,
                  line: lineIndex + 1,
                  excerpt: originalLine.trim()
                });
              }
            }
          }
        }
      }
    } catch {
      // Ignore reading errors
    }
  }

  return {
    variables: Array.from(envVars).sort(),
    sources,
    optional
  };
}

/**
 * Parses Cargo.toml content.
 */
export function parseCargoTomlContent(content: string): { name?: string, version?: string, description?: string, dependencies: string[], devDependencies: string[] } {
  const lines = content.split(/\r?\n/);
  
  let name: string | undefined;
  let version: string | undefined;
  let description: string | undefined;
  const dependencies: string[] = [];
  const devDependencies: string[] = [];
  
  let currentSection = '';
  
  const sectionRegex = /^\[([^\]]+)\]/;
  const stringValRegex = /^\s*([a-zA-Z0-9:_-]+)\s*=\s*"([^"]+)"/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const secMatch = trimmed.match(sectionRegex);
    if (secMatch) {
      currentSection = secMatch[1].trim();
      continue;
    }
    
    if (currentSection === 'package') {
      const match = trimmed.match(stringValRegex);
      if (match) {
        const key = match[1];
        const val = match[2];
        if (key === 'name') name = val;
        else if (key === 'version') version = val;
        else if (key === 'description') description = val;
      }
    } else if (currentSection === 'dependencies') {
      const match = trimmed.match(/^\s*([a-zA-Z0-9:_-]+)\s*=/);
      if (match && match[1]) {
        dependencies.push(match[1]);
      }
    } else if (currentSection === 'dev-dependencies') {
      const match = trimmed.match(/^\s*([a-zA-Z0-9:_-]+)\s*=/);
      if (match && match[1]) {
        devDependencies.push(match[1]);
      }
    }
  }
  return { name, version, description, dependencies, devDependencies };
}

/**
 * Light parser for Rust Cargo.toml.
 */
async function parseCargoToml(filePath: string): Promise<{ name?: string, version?: string, description?: string, dependencies: string[], devDependencies: string[] }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseCargoTomlContent(content);
  } catch {
    return { dependencies: [], devDependencies: [] };
  }
}

/**
 * Parses pyproject.toml content.
 */
export function parsePyProjectTomlContent(content: string): { name?: string, version?: string, description?: string, dependencies: string[] } {
  const lines = content.split(/\r?\n/);
  
  let name: string | undefined;
  let version: string | undefined;
  let description: string | undefined;
  const dependencies: string[] = [];
  
  let currentSection = '';
  let inDependencyList = false;
  
  const sectionRegex = /^\[([^\]]+)\]/;
  const stringValRegex = /^\s*([a-zA-Z0-9:_-]+)\s*=\s*"([^"]+)"/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const secMatch = trimmed.match(sectionRegex);
    if (secMatch) {
      currentSection = secMatch[1].trim();
      inDependencyList = false;
      continue;
    }
    
    if (inDependencyList) {
      if (trimmed.includes(']')) {
        inDependencyList = false;
      }
      const depVal = trimmed.replace(/[\[\]'",]/g, '').trim();
      if (depVal) {
        dependencies.push(depVal.split(/[>=<~]/)[0].trim());
      }
    } else if (currentSection === 'project') {
      const match = trimmed.match(stringValRegex);
      if (match) {
        const key = match[1];
        const val = match[2];
        if (key === 'name') name = val;
        else if (key === 'version') version = val;
        else if (key === 'description') description = val;
      }
      
      if (trimmed.startsWith('dependencies') && trimmed.includes('[')) {
        inDependencyList = true;
        const inlineMatch = trimmed.match(/\[([^\]]+)\]/);
        if (inlineMatch && inlineMatch[1]) {
          const deps = inlineMatch[1].split(',').map(d => d.trim().replace(/['"]/g, ''));
          for (const dep of deps) {
            if (dep) dependencies.push(dep.split(/[>=<~]/)[0].trim());
          }
          inDependencyList = false;
        }
      }
    }
  }
  return { name, version, description, dependencies };
}

/**
 * Light parser for Python pyproject.toml.
 */
async function parsePyProjectToml(filePath: string): Promise<{ name?: string, version?: string, description?: string, dependencies: string[] }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parsePyProjectTomlContent(content);
  } catch {
    return { dependencies: [] };
  }
}

/**
 * Parses requirements.txt content.
 */
export function parseRequirementsTxtContent(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const dependencies: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
    
    const parts = trimmed.split(/[>=<~;]/);
    const depName = parts[0].trim();
    if (depName) {
      dependencies.push(depName);
    }
  }
  return dependencies;
}

/**
 * Light parser for Python requirements.txt.
 */
async function parseRequirementsTxt(filePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseRequirementsTxtContent(content);
  } catch {
    return [];
  }
}

/**
 * Parses go.mod content.
 */
export function parseGoModContent(content: string): { name?: string, dependencies: string[] } {
  const lines = content.split(/\r?\n/);
  
  let name: string | undefined;
  const dependencies: string[] = [];
  
  let inRequireBlock = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    
    if (trimmed.startsWith('module ')) {
      name = trimmed.replace('module ', '').trim();
      continue;
    }
    
    if (trimmed.startsWith('require (')) {
      inRequireBlock = true;
      continue;
    }
    
    if (inRequireBlock && trimmed === ')') {
      inRequireBlock = false;
      continue;
    }
    
    if (inRequireBlock) {
      const parts = trimmed.split(/\s+/);
      if (parts[0]) {
        dependencies.push(parts[0]);
      }
    } else if (trimmed.startsWith('require ')) {
      const parts = trimmed.replace('require ', '').trim().split(/\s+/);
      if (parts[0]) {
        dependencies.push(parts[0]);
      }
    }
  }
  return { name, dependencies };
}

/**
 * Light parser for Go go.mod.
 */
async function parseGoMod(filePath: string): Promise<{ name?: string, dependencies: string[] }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseGoModContent(content);
  } catch {
    return { dependencies: [] };
  }
}

/**
 * Parses composer.json (PHP) content.
 */
export function parseComposerJsonContent(content: string): { name?: string, version?: string, description?: string, dependencies: string[], devDependencies: string[] } {
  try {
    const pkg = JSON.parse(content);
    const name = pkg.name || undefined;
    const version = pkg.version || undefined;
    const description = pkg.description || undefined;
    const dependencies = pkg.require ? Object.keys(pkg.require).filter(d => d !== 'php' && !d.startsWith('ext-')) : [];
    const devDependencies = pkg['require-dev'] ? Object.keys(pkg['require-dev']) : [];
    return { name, version, description, dependencies, devDependencies };
  } catch {
    return { dependencies: [], devDependencies: [] };
  }
}

/**
 * Light parser for PHP composer.json.
 */
async function parseComposerJson(filePath: string): Promise<{ name?: string, version?: string, description?: string, dependencies: string[], devDependencies: string[] }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseComposerJsonContent(content);
  } catch {
    return { dependencies: [], devDependencies: [] };
  }
}

/**
 * Parses pom.xml (Java/Maven) content using lightweight regex extraction.
 */
export function parsePomXmlContent(content: string): { name?: string, version?: string, description?: string, dependencies: string[] } {
  const dependencies: string[] = [];
  
  // Extract top-level artifactId (not inside <dependencies>)
  const artifactMatch = content.match(/<artifactId>([^<]+)<\/artifactId>/);
  const name = artifactMatch ? artifactMatch[1].trim() : undefined;
  
  // Extract top-level version
  const versionMatch = content.match(/<version>([^<]+)<\/version>/);
  const version = versionMatch ? versionMatch[1].trim() : undefined;
  
  // Extract top-level description
  const descMatch = content.match(/<description>([^<]+)<\/description>/);
  const description = descMatch ? descMatch[1].trim() : undefined;
  
  // Extract dependency artifactIds from <dependencies> block
  const depsBlock = content.match(/<dependencies>([\s\S]*?)<\/dependencies>/);
  if (depsBlock) {
    const depRegex = /<dependency>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<\/dependency>/g;
    let depMatch;
    while ((depMatch = depRegex.exec(depsBlock[1])) !== null) {
      if (depMatch[1]) {
        dependencies.push(depMatch[1].trim());
      }
    }
  }
  
  return { name, version, description, dependencies };
}

/**
 * Light parser for Java/Maven pom.xml.
 */
async function parsePomXml(filePath: string): Promise<{ name?: string, version?: string, description?: string, dependencies: string[] }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parsePomXmlContent(content);
  } catch {
    return { dependencies: [] };
  }
}

/**
 * Parses Gemfile (Ruby) content.
 */
export function parseGemfileContent(content: string): { dependencies: string[] } {
  const lines = content.split(/\r?\n/);
  const dependencies: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Match: gem 'name' or gem "name" with optional version/options
    const gemMatch = trimmed.match(/^gem\s+['"]([a-zA-Z0-9_-]+)['"]/);
    if (gemMatch && gemMatch[1]) {
      dependencies.push(gemMatch[1]);
    }
  }
  return { dependencies };
}

/**
 * Light parser for Ruby Gemfile.
 */
async function parseGemfile(filePath: string): Promise<{ dependencies: string[] }> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseGemfileContent(content);
  } catch {
    return { dependencies: [] };
  }
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
  const projectTypes = new Set<string>();
  const packageManager = detectPackageManager(files);

  // 1. Parse package.json if it exists
  const hasPackageJson = files.includes('package.json');
  if (hasPackageJson) {
    projectTypes.add('Node.js');
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

  // 2. Parse Cargo.toml (Rust) if it exists
  const hasCargoToml = files.includes('Cargo.toml');
  if (hasCargoToml) {
    projectTypes.add('Rust');
    const cargoData = await parseCargoToml(path.join(resolvedPath, 'Cargo.toml'));
    if (cargoData.name && projectName === path.basename(resolvedPath)) projectName = cargoData.name;
    if (cargoData.version) version = cargoData.version;
    if (cargoData.description) description = cargoData.description;
    dependencies.push(...cargoData.dependencies);
    devDependencies.push(...cargoData.devDependencies);
    
    // Fallback scripts if package.json scripts is empty
    if (Object.keys(scripts).length === 0) {
      scripts = {
        build: 'cargo build',
        run: 'cargo run',
        test: 'cargo test'
      };
    }
  }

  // 3. Parse pyproject.toml (Python) if it exists
  const hasPyProject = files.includes('pyproject.toml');
  if (hasPyProject) {
    projectTypes.add('Python');
    const pyData = await parsePyProjectToml(path.join(resolvedPath, 'pyproject.toml'));
    if (pyData.name && projectName === path.basename(resolvedPath)) projectName = pyData.name;
    if (pyData.version) version = pyData.version;
    if (pyData.description) description = pyData.description;
    dependencies.push(...pyData.dependencies);
    
    if (Object.keys(scripts).length === 0) {
      scripts = {
        run: `python -m ${pyData.name || 'main'}`,
        test: 'pytest'
      };
    }
  }

  // 4. Parse requirements.txt (Python) if it exists
  const hasRequirements = files.includes('requirements.txt');
  if (hasRequirements) {
    projectTypes.add('Python');
    const reqDeps = await parseRequirementsTxt(path.join(resolvedPath, 'requirements.txt'));
    dependencies.push(...reqDeps);
  }

  // 5. Parse go.mod (Go) if it exists
  const hasGoMod = files.includes('go.mod');
  if (hasGoMod) {
    projectTypes.add('Go');
    const goData = await parseGoMod(path.join(resolvedPath, 'go.mod'));
    if (goData.name && projectName === path.basename(resolvedPath)) projectName = goData.name;
    dependencies.push(...goData.dependencies);
    
    if (Object.keys(scripts).length === 0) {
      scripts = {
        build: 'go build',
        run: 'go run .',
        test: 'go test ./...'
      };
    }
  }

  // 6. Parse composer.json (PHP) if it exists
  const hasComposer = files.includes('composer.json');
  if (hasComposer) {
    projectTypes.add('PHP');
    const composerData = await parseComposerJson(path.join(resolvedPath, 'composer.json'));
    if (composerData.name && projectName === path.basename(resolvedPath)) projectName = composerData.name;
    if (composerData.version) version = composerData.version;
    if (composerData.description) description = composerData.description;
    dependencies.push(...composerData.dependencies);
    devDependencies.push(...composerData.devDependencies);
    
    if (Object.keys(scripts).length === 0) {
      scripts = {
        serve: 'php -S localhost:8000 -t public',
        test: 'vendor/bin/phpunit'
      };
    }
  }

  const hasPhpFiles = hasPhpApplicationFiles(files);
  if (hasPhpFiles && !hasComposer) {
    projectTypes.add('PHP');
    if (Object.keys(scripts).length === 0) {
      scripts = {
        serve: 'php -S localhost:8000',
        test: hasPhpUnitTests(files) ? 'vendor/bin/phpunit tests/' : 'php -l index.php'
      };
    }
  }

  // 7. Parse pom.xml (Java/Maven) if it exists
  const hasPom = files.includes('pom.xml');
  if (hasPom) {
    projectTypes.add('Java/Maven');
    const pomData = await parsePomXml(path.join(resolvedPath, 'pom.xml'));
    if (pomData.name && projectName === path.basename(resolvedPath)) projectName = pomData.name;
    if (pomData.version) version = pomData.version;
    if (pomData.description) description = pomData.description;
    dependencies.push(...pomData.dependencies);
    
    if (Object.keys(scripts).length === 0) {
      scripts = {
        build: 'mvn clean install',
        test: 'mvn test',
        run: 'mvn spring-boot:run'
      };
    }
  }

  // 8. Parse Gemfile (Ruby) if it exists
  const hasGemfile = files.includes('Gemfile');
  if (hasGemfile) {
    projectTypes.add('Ruby');
    const gemData = await parseGemfile(path.join(resolvedPath, 'Gemfile'));
    dependencies.push(...gemData.dependencies);
    
    if (Object.keys(scripts).length === 0) {
      scripts = {
        run: 'bundle exec ruby app.rb',
        test: 'bundle exec rspec'
      };
    }
  }

  const hasDocker = files.includes('Dockerfile') || files.some(f => f.endsWith('/Dockerfile'));
  const hasDockerCompose = files.some(f => f.toLowerCase().includes('docker-compose'));

  // Env variables
  const envExamplePath = files.find(f => f.toLowerCase() === '.env.example');
  const envExampleVariables = envExamplePath 
    ? await parseEnvExample(path.join(resolvedPath, envExamplePath)) 
    : [];

  const envScan = await scanEnvVariablesInCode(resolvedPath, files);
  const envVariables = envScan.variables;

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
    rootPath: resolvedPath,
    projectName,
    version,
    description,
    packageManager,
    projectTypes: Array.from(projectTypes),
    scripts,
    dependencies,
    devDependencies,
    hasDocker,
    hasDockerCompose,
    envVariables,
    envVariableSources: envScan.sources,
    envVariableOptional: envScan.optional,
    envExampleVariables,
    files,
    readmePath,
    readmeContent
  };
}
