import { IAProvider } from './provider.js';
import { ProjectContext } from '../core/types.js';
import { getSummaryPrompt, getFixesPrompt, getReadmePrompt, getTranslationPrompt } from './prompts.js';
import { redactSecrets } from './security.js';

export class GeminiProvider implements IAProvider {
  name = 'Gemini (Google)';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  private async callGemini(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }

    const securePrompt = redactSecrets(prompt);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: securePrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    
    try {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Unexpected response format from Gemini API');
      }
      return text;
    } catch (e: any) {
      throw new Error(`Failed to parse Gemini response: ${e.message}. Raw data: ${JSON.stringify(data)}`);
    }
  }

  async generateSummary(context: ProjectContext): Promise<string> {
    const prompt = getSummaryPrompt(context);
    return this.callGemini(prompt);
  }

  async suggestFixes(context: ProjectContext, issuesJson: string): Promise<string> {
    const prompt = getFixesPrompt(context, issuesJson);
    return this.callGemini(prompt);
  }

  async generateReadme(context: ProjectContext): Promise<string> {
    const prompt = getReadmePrompt(context);
    return this.callGemini(prompt);
  }

  async translateReadme(readmeContent: string, targetLang: string): Promise<string> {
    const prompt = getTranslationPrompt(readmeContent, targetLang);
    return this.callGemini(prompt);
  }
}
