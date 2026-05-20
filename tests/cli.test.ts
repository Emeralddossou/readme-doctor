import { describe, it, expect } from 'vitest';
import { colorizeMarkdown } from '../src/reports/generator.js';
import { getTranslationPrompt } from '../src/ai/prompts.js';

describe('CLI Improvements & Translation Prompt', () => {
  describe('colorizeMarkdown', () => {
    it('should format headers with ANSI codes', () => {
      const markdown = '# Main Title\n## Sub Title\n### ❌ [ERROR] Issue';
      const colored = colorizeMarkdown(markdown);
      
      expect(colored).toContain('\x1b[1;36m# Main Title\x1b[0m');
      expect(colored).toContain('\x1b[1;34m## Sub Title\x1b[0m');
      expect(colored).toContain('\x1b[1;35m### \x1b[1;31m❌ [ERROR]\x1b[1;35m Issue\x1b[0m');
    });

    it('should format bold text and score indicators', () => {
      const markdown = 'This is **bold** text.\n🔴 **50/100** [█████░░░░░]';
      const colored = colorizeMarkdown(markdown);

      expect(colored).toContain('This is \x1b[1mbold\x1b[22m text.');
      expect(colored).toContain('\x1b[1;31m🔴 \x1b[1m50/100\x1b[22m\x1b[0m [█████░░░░░]');
    });
  });

  describe('getTranslationPrompt', () => {
    it('should generate a translation prompt', () => {
      const readme = 'Hello World';
      const lang = 'french';
      const prompt = getTranslationPrompt(readme, lang);

      expect(prompt).toContain('Translate all explanatory text, headers, and descriptions into "french"');
      expect(prompt).toContain('Hello World');
    });
  });
});
