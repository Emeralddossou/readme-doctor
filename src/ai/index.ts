import { IAProvider } from './provider.js';
import { GeminiProvider } from './gemini.js';
import { GroqProvider } from './groq.js';

export function getAIProvider(): IAProvider | null {
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider();
  }
  if (process.env.GROQ_API_KEY) {
    return new GroqProvider();
  }
  return null;
}

export * from './provider.js';
export * from './security.js';
