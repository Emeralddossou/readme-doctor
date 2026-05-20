import fs from 'fs/promises';
import path from 'path';
import { Issue, ProjectContext, ReadmeContext } from '../../core/types.js';
import { Rule } from './baseRule.js';
import { parseReadme } from '../../scanners/readmeParser.js';

interface SectionAliasMap {
  name: string;
  aliases: string[];
}

export class TranslationSyncRule implements Rule {
  id = 'desynchronized-translation';
  name = 'Multilingual README Synchronization';
  description = 'Ensures translated versions of the README have structural alignment with the main README';

  private standardSections: SectionAliasMap[] = [
    {
      name: 'Installation',
      aliases: [
        'installation', 'setup', 'get started', 'getting started', 'prerequisites', 'démarrage', 'configuration requise',
        'instalación', 'prerrequisitos', 'einrichtung', 'voraussetzungen', 'インストール', 'セットアップ'
      ]
    },
    {
      name: 'Usage',
      aliases: [
        'usage', 'run', 'running', 'example', 'examples', 'utilisation', 'lancement',
        'uso', 'ejemplos', 'benutzung', 'ausführung', 'beispiele', '使い方', '使用法', '実行'
      ]
    },
    {
      name: 'Configuration',
      aliases: [
        'config', 'configuration', 'environment', 'env', 'variables',
        'parámetros', 'configuración', 'konfiguration', 'umgebungsvariablen', '設定', '環境変数'
      ]
    },
    {
      name: 'Contributing',
      aliases: [
        'contribute', 'contributing', 'contribution', 'contribuer',
        'cómo contribuir', 'contribución', 'mitwirken', 'beitragen', 'contribuições', '貢献', '寄付'
      ]
    },
    {
      name: 'License',
      aliases: [
        'license', 'licence', 'licencia', 'lizenz', 'licença', 'ライセンス'
      ]
    }
  ];

  private getLanguageName(filename: string): string {
    const parts = filename.split('.');
    if (parts.length > 2) {
      const code = parts[parts.length - 2].toLowerCase();
      switch (code) {
        case 'fr': case 'fre': case 'fra': return 'French';
        case 'es': case 'esp': return 'Spanish';
        case 'de': case 'deu': case 'ger': return 'German';
        case 'ja': case 'jp': case 'jpn': return 'Japanese';
        case 'zh': case 'zho': case 'chi': return 'Chinese';
        case 'it': case 'ita': return 'Italian';
        case 'pt': case 'por': return 'Portuguese';
        case 'ru': case 'rus': return 'Russian';
        case 'en': case 'eng': return 'English';
        default: return code.toUpperCase();
      }
    }
    return 'translated';
  }

  async run(projectContext: ProjectContext, readmeContext: ReadmeContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    const mainReadmePath = projectContext.readmePath;
    
    if (!mainReadmePath) {
      return [];
    }

    const mainReadmeLower = mainReadmePath.toLowerCase();

    // 1. Detect all other README translation files in root directory
    const rootFiles = projectContext.files.filter(f => !f.includes('/') && !f.includes(path.sep));
    const translationFiles = rootFiles.filter(f => {
      const lower = f.toLowerCase();
      return lower.startsWith('readme') && lower.endsWith('.md') && lower !== mainReadmeLower;
    });

    if (translationFiles.length === 0) {
      return [];
    }

    // 2. Map standard sections present in the main README
    const mainSections = readmeContext.sections;
    const activeRequirements = this.standardSections.filter(secReq => {
      return mainSections.some(mainSec => {
        const titleLower = mainSec.title.toLowerCase();
        return secReq.aliases.some(alias => titleLower.includes(alias));
      });
    });

    // 3. Check each translation file
    for (const translationFile of translationFiles) {
      let content = '';
      try {
        content = await fs.readFile(translationFile, 'utf-8');
      } catch {
        continue; // skip if unreadable
      }

      const transContext = parseReadme(content);
      const transSections = transContext.sections;
      const langName = this.getLanguageName(translationFile);

      // Verify that all standard sections present in main README are also in the translation
      for (const req of activeRequirements) {
        const hasSection = transSections.some(transSec => {
          const transTitleLower = transSec.title.toLowerCase();
          return req.aliases.some(alias => transTitleLower.includes(alias));
        });

        if (!hasSection) {
          issues.push({
            id: `${this.id}:${translationFile.toLowerCase()}:${req.name.toLowerCase()}`,
            severity: 'warning',
            ruleName: this.name,
            message: `The translation file "${translationFile}" (${langName}) is missing the "${req.name}" section, which is documented in the main README.`,
            suggestion: `Add the missing "${req.name}" section in "${translationFile}" to maintain structure alignment with the main README.md.`
          });
        }
      }
    }

    return issues;
  }
}
