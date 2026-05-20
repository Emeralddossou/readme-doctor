import { IAProvider } from './provider.js';
import { ProjectContext } from '../core/types.js';
import { getSummaryPrompt, getFixesPrompt, getReadmePrompt, getTranslationPrompt } from './prompts.js';
import { redactSecrets } from './security.js';

export class GroqProvider implements IAProvider {
  name = 'Groq (LLaMA)';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  private async callGroq(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not defined in environment variables.');
    }

    const securePrompt = redactSecrets(prompt);
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'user', content: securePrompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    
    try {
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('Unexpected response format from Groq API');
      }
      return text;
    } catch (e: any) {
      throw new Error(`Failed to parse Groq response: ${e.message}. Raw data: ${JSON.stringify(data)}`);
    }
  }

  async generateSummary(context: ProjectContext): Promise<string> {
    const prompt = getSummaryPrompt(context);
    return this.callGroq(prompt);
  }

  async suggestFixes(context: ProjectContext, issuesJson: string): Promise<string> {
    const prompt = getFixesPrompt(context, issuesJson);
    return this.callGroq(prompt);
  }

  async generateReadme(context: ProjectContext): Promise<string> {
    const prompt = getReadmePrompt(context);
    return this.callGroq(prompt);
  }

  async translateReadme(readmeContent: string, targetLang: string): Promise<string> {
    const prompt = getTranslationPrompt(readmeContent, targetLang);
    return this.callGroq(prompt);
  }
}
