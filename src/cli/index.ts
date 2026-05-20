import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { scanProject } from '../scanners/projectScanner.js';
import { parseReadme } from '../scanners/readmeParser.js';
import { analyzeProject } from '../analyzers/engine.js';
import { generateMarkdownReport, generateJsonReport, colorizeMarkdown } from '../reports/generator.js';
import { getAIProvider } from '../ai/index.js';

export function setupCLI(): Command {
  const program = new Command();

  program
    .name('readme-doctor')
    .description('🩺 README-Doctor : Audit and improve your project documentation')
    .version('1.0.0');

  // --- COMMAND: SCAN ---
  program
    .command('scan')
    .description('Scan the local repository, analyze consistency, and generate a report')
    .argument('[repoPath]', 'Path to the local repository', '.')
    .option('-j, --json', 'Output report in JSON format')
    .option('-o, --output <file>', 'Save the report to a file')
    .option('--no-ai', 'Disable AI features, running pure local analysis')
    .option('--strict', 'Exit with code 1 if issues are found (useful for CI/CD)')
    .action(async (repoPath, options) => {
      try {
        console.log(`🔍 Scanning repository at: ${path.resolve(repoPath)}...`);
        const projectContext = await scanProject(repoPath);
        const readmeContext = parseReadme(projectContext.readmeContent);
        
        console.log('⚡ Running static analysis rules...');
        const report = await analyzeProject(projectContext, readmeContext);
        
        const aiProvider = options.ai ? getAIProvider() : null;
        if (aiProvider) {
          console.log(`🤖 Enriching report using AI Provider: ${aiProvider.name}...`);
          try {
            report.summary = await aiProvider.generateSummary(projectContext);
            if (report.issues.length > 0) {
              report.suggestedReadme = await aiProvider.suggestFixes(projectContext, JSON.stringify(report.issues, null, 2));
            }
          } catch (aiErr: any) {
            console.warn(`⚠️ AI Enrichment failed: ${aiErr.message}. Falling back to local-only results.`);
          }
        } else if (options.ai) {
          console.log('ℹ️ Pure local analysis executed (No GEMINI_API_KEY or GROQ_API_KEY found).');
        }

        // Generate output
        const outputContent = options.json ? generateJsonReport(report) : generateMarkdownReport(report);

        if (options.output) {
          const outputPath = path.resolve(options.output);
          await fs.writeFile(outputPath, outputContent, 'utf-8');
          console.log(`✅ Report successfully saved to: ${outputPath}`);
        } else {
          console.log('\n--- REPORT OUTPUT ---');
          console.log(options.json ? outputContent : colorizeMarkdown(outputContent));
        }

        const strictIssues = report.issues.filter(i => i.severity === 'error' || i.severity === 'warning');
        if (options.strict && strictIssues.length > 0) {
          console.error(`\n❌ Strict Mode: ${strictIssues.length} critical issue(s) or warning(s) detected. Exiting with code 1.`);
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`❌ Scan failed: ${err.message}`);
        process.exit(1);
      }
    });

  // --- COMMAND: SUMMARIZE ---
  program
    .command('summarize')
    .description('Generate an intelligent summary of the repository')
    .argument('[repoPath]', 'Path to the local repository', '.')
    .action(async (repoPath) => {
      try {
        const aiProvider = getAIProvider();
        if (!aiProvider) {
          console.error('❌ Error: AI provider requires GEMINI_API_KEY or GROQ_API_KEY to be set in environment variables.');
          process.exit(1);
        }

        console.log(`🔍 Reading repository at: ${path.resolve(repoPath)}...`);
        const projectContext = await scanProject(repoPath);

        console.log(`🤖 Generating intelligent summary using ${aiProvider.name}...`);
        const summary = await aiProvider.generateSummary(projectContext);

        console.log('\n--- PROJECT SUMMARY ---');
        console.log(summary);
      } catch (err: any) {
        console.error(`❌ Summary failed: ${err.message}`);
        process.exit(1);
      }
    });

  // --- COMMAND: INIT ---
  program
    .command('init')
    .description('Generate a premium, complete README.md template tailored to your codebase')
    .argument('[repoPath]', 'Path to the local repository', '.')
    .option('-o, --output <file>', 'Save the generated README to a specific file', 'README-DOCTOR-SUGGESTED.md')
    .action(async (repoPath, options) => {
      try {
        const aiProvider = getAIProvider();
        if (!aiProvider) {
          console.error('❌ Error: AI provider requires GEMINI_API_KEY or GROQ_API_KEY to be set in environment variables.');
          process.exit(1);
        }

        console.log(`🔍 Analyzing codebase at: ${path.resolve(repoPath)}...`);
        const projectContext = await scanProject(repoPath);

        console.log(`🤖 Designing a premium README template using ${aiProvider.name}...`);
        const generatedReadme = await aiProvider.generateReadme(projectContext);

        const outputPath = path.resolve(options.output);
        await fs.writeFile(outputPath, generatedReadme, 'utf-8');

        console.log(`\n✅ Premium README successfully created and saved to: ${outputPath}`);
        console.log('💡 Review this file and rename it to README.md to use it as your project landing page.');
      } catch (err: any) {
        console.error(`❌ Initialization failed: ${err.message}`);
        process.exit(1);
      }
    });

  // --- COMMAND: FIX ---
  program
    .command('fix')
    .description('Identify issues and propose exact Markdown corrections')
    .argument('[repoPath]', 'Path to the local repository', '.')
    .action(async (repoPath) => {
      try {
        const aiProvider = getAIProvider();
        if (!aiProvider) {
          console.error('❌ Error: AI provider requires GEMINI_API_KEY or GROQ_API_KEY to be set in environment variables.');
          process.exit(1);
        }

        console.log(`🔍 Scanning repository at: ${path.resolve(repoPath)}...`);
        const projectContext = await scanProject(repoPath);
        const readmeContext = parseReadme(projectContext.readmeContent);
        
        console.log('⚡ Running local consistency checks...');
        const report = await analyzeProject(projectContext, readmeContext);

        if (report.issues.length === 0) {
          console.log('🎉 No issues detected in your README. No fixes needed!');
          return;
        }

        console.log(`🤖 Formulating README corrections via ${aiProvider.name}...`);
        const fixes = await aiProvider.suggestFixes(projectContext, JSON.stringify(report.issues, null, 2));

        console.log('\n--- SUGGESTED README PATCHES & CORRECTIONS ---');
        console.log(fixes);
      } catch (err: any) {
        console.error(`❌ Fix failed: ${err.message}`);
        process.exit(1);
      }
    });

  // --- COMMAND: TRANSLATE ---
  program
    .command('translate')
    .description('Translate your current README into another language using AI')
    .argument('[repoPath]', 'Path to the local repository', '.')
    .requiredOption('-l, --lang <language>', 'Target language for the translation (e.g. french, spanish, japanese)')
    .option('-o, --output <file>', 'Save the translated README to a specific file')
    .action(async (repoPath, options) => {
      try {
        const aiProvider = getAIProvider();
        if (!aiProvider) {
          console.error('❌ Error: AI provider requires GEMINI_API_KEY or GROQ_API_KEY to be set in environment variables.');
          process.exit(1);
        }

        console.log(`🔍 Scanning repository at: ${path.resolve(repoPath)}...`);
        const projectContext = await scanProject(repoPath);

        if (!projectContext.readmeContent) {
          console.error('❌ Error: No README file found to translate.');
          process.exit(1);
        }

        console.log(`🤖 Translating README into "${options.lang}" using ${aiProvider.name}...`);
        const translatedReadme = await aiProvider.translateReadme(projectContext.readmeContent, options.lang);

        const defaultFileName = `README.${options.lang.toLowerCase().substring(0, 3)}.md`;
        const outputPath = path.resolve(options.output || path.join(repoPath, defaultFileName));
        await fs.writeFile(outputPath, translatedReadme, 'utf-8');

        console.log(`\n✅ Translated README successfully created and saved to: ${outputPath}`);
      } catch (err: any) {
        console.error(`❌ Translation failed: ${err.message}`);
        process.exit(1);
      }
    });

  return program;
}
