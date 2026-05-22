import fs from 'fs/promises';
import path from 'path';
import { Issue, ProjectContext, ReadmeContext } from '../../core/types.js';
import { Rule } from './baseRule.js';

export class LicenseRule implements Rule {
  id = 'undocumented-license';
  name = 'License Documentation Consistency';
  description = 'Ensures that license files present in the repository are documented in the README';

  private async detectLicenseType(basePath: string, licenseFile: string): Promise<string | null> {
    try {
      const fullPath = path.join(basePath, licenseFile);
      const content = await fs.readFile(fullPath, 'utf-8');
      const text = content.substring(0, 1000).toLowerCase();

      if (text.includes('mit license') || text.includes('permission is hereby granted')) {
        return 'MIT';
      }
      if (text.includes('apache license') || text.includes('apache-2.0')) {
        return 'Apache 2.0';
      }
      if (text.includes('gnu general public license') || text.includes('gpl')) {
        return 'GPL';
      }
      if (text.includes('mozilla public license') || text.includes('mpl')) {
        return 'MPL';
      }
      if (text.includes('bsd') && text.includes('redistribution and use')) {
        return 'BSD';
      }
      return null;
    } catch {
      return null;
    }
  }

  private readmeMentionsLicense(readmeText: string, readmeContext: ReadmeContext): boolean {
    const hasLicenseSection = readmeContext.sections.some(section => /licen[csz]e/i.test(section.title));
    const hasLicenseStatement = /\blicensed under\b|\bMIT License\b|\bApache License\b|\bGPL\b|\bBSD\b/i.test(readmeText);
    return hasLicenseSection || hasLicenseStatement;
  }

  async run(projectContext: ProjectContext, readmeContext: ReadmeContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    const readmeText = projectContext.readmeContent || '';

    // Find a license file in the project files list (root level or any level)
    // We prioritize root level files
    const rootFiles = projectContext.files.filter(f => !f.includes('/') && !f.includes(path.sep));
    const licenseFile = rootFiles.find(f => {
      const lower = f.toLowerCase();
      return lower === 'license' || lower === 'licence' || 
             lower.startsWith('license.') || lower.startsWith('licence.');
    });

    if (licenseFile) {
      // 1. License file exists
      const mentionsLicense = this.readmeMentionsLicense(readmeText, readmeContext);

      if (!mentionsLicense && readmeText) {
        // License exists in files but not in README
        let licenseType = 'project license';
        
        const detected = await this.detectLicenseType(projectContext.rootPath ?? process.cwd(), licenseFile);
        if (detected) {
          licenseType = `${detected} License`;
        }

        issues.push({
          id: this.id,
          severity: 'warning',
          ruleName: this.name,
          message: `A license file ("${licenseFile}") is present in the repository, but the license is not mentioned in the README.`,
          suggestion: `Add a "License" section at the end of your README. For example:\n\n## License\nThis project is licensed under the ${licenseType} - see the [${licenseFile}](${licenseFile}) file for details.`,
          confidence: 'high',
          fixType: 'readme-section',
          evidence: [
            {
              description: 'License file detected.',
              file: licenseFile
            },
            {
              description: 'README has no license section or license statement.',
              file: projectContext.readmePath ?? 'README'
            }
          ]
        });
      }
    } else {
      // 2. No license file exists and README doesn't mention license either
      const mentionsLicense = this.readmeMentionsLicense(readmeText, readmeContext);
      if (!mentionsLicense && readmeText) {
        issues.push({
          id: `${this.id}:missing-file`,
          severity: 'info',
          ruleName: this.name,
          message: 'No license file was detected in the project, and the README does not specify a license.',
          suggestion: 'It is highly recommended to add an open source license (such as the MIT License) to clarify how others can use your code. Create a `LICENSE` file and mention it in the README.',
          confidence: 'medium',
          fixType: 'manual',
          evidence: [
            {
              description: 'No root license file was found.',
              file: projectContext.rootPath
            },
            {
              description: 'README has no license section or license statement.',
              file: projectContext.readmePath ?? 'README'
            }
          ]
        });
      }
    }

    return issues;
  }
}
