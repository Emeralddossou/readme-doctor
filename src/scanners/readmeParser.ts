import { ReadmeCommand, ReadmeContext, ReadmeSection } from '../core/types.js';

/**
 * Parses README content to split it into sections by Markdown headings
 * and extracts commands from shell code blocks.
 */
export function parseReadme(content: string | null): ReadmeContext {
  if (!content) {
    return { sections: [], commands: [] };
  }

  const sections: ReadmeSection[] = [];
  const commands: string[] = [];
  const commandDetails: ReadmeCommand[] = [];

  const lines = content.split(/\r?\n/);
  
  let currentTitle = 'Introduction';
  let currentLevel = 1;
  let currentStartLine = 1;
  let currentLines: string[] = [];
  
  let inCodeBlock = false;
  let codeBlockLanguage = '';
  let codeBlockLines: Array<{ text: string; line: number }> = [];

  const headingRegex = /^(#{1,6})\s+(.+)$/;
  const codeBlockRegex = /^```(\w*)/;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = index + 1;
    // Check for code blocks
    const codeBlockMatch = line.match(codeBlockRegex);
    if (codeBlockMatch) {
      if (inCodeBlock) {
        // End of code block
        inCodeBlock = false;
        // Extract commands if the language is shell-like or empty
        const lang = codeBlockLanguage.toLowerCase();
        if (['bash', 'sh', 'shell', 'cmd', 'powershell', 'zsh', 'run', ''].includes(lang)) {
          for (let codeIndex = 0; codeIndex < codeBlockLines.length; codeIndex++) {
            const trimmed = codeBlockLines[codeIndex].text.trim();
            // Skip comments and empty lines
            if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
              commands.push(trimmed);
              commandDetails.push({
                command: trimmed,
                line: codeBlockLines[codeIndex].line
              });
            }
          }
        }
        codeBlockLines = [];
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLanguage = codeBlockMatch[1] || '';
      }
      currentLines.push(line);
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push({ text: line, line: lineNumber });
      currentLines.push(line);
      continue;
    }

    // Check for headings
    const headingMatch = line.match(headingRegex);
    if (headingMatch) {
      // Save current section before starting a new one
      const contentStr = currentLines.join('\n').trim();
      if (contentStr !== '' || (currentTitle !== 'Introduction' && currentTitle !== '')) {
        sections.push({
          title: currentTitle,
          level: currentLevel,
          content: contentStr,
          line: currentStartLine
        });
      }
      currentLevel = headingMatch[1].length;
      currentTitle = headingMatch[2].trim();
      currentStartLine = lineNumber;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Push the final section
  const finalContentStr = currentLines.join('\n').trim();
  if (finalContentStr !== '' || (currentTitle !== 'Introduction' && currentTitle !== '')) {
    sections.push({
      title: currentTitle,
      level: currentLevel,
      content: finalContentStr,
      line: currentStartLine
    });
  }

  return {
    sections,
    commands,
    commandDetails
  };
}
