/**
 * Security utility to redact secrets, tokens, and passwords from text
 * before sending to any external AI provider.
 */
export function redactSecrets(text: string): string {
  let redacted = text;

  // 1. High probability API keys & tokens
  const patterns = [
    // GitHub Tokens
    /ghp_[a-zA-Z0-9]+/gi,
    /github_pat_[a-zA-Z0-9_]+/gi,
    // AWS Access Key and Secret Key
    /AKIA[0-9A-Z]{16}/g,
    /(?:aws_secret_access_key|aws_secret|aws_key)\s*[:=]\s*(?:['"]([^'"]+)['"]|([a-zA-Z0-9/+=]{40}))/gi,
    // Stripe API keys
    /[sk|rk]_(?:test|live)_[0-9a-zA-Z]{24}/g,
    // Slack OAuth tokens and Webhooks
    /xox[bapr]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}/g,
    /https:\/\/hooks\.slack\.com\/services\/[T0-9a-zA-Z]+\/[B0-9a-zA-Z]+\/[0-9a-zA-Z]+/g,
    // Generic API Keys / Secrets assignments in .env or text
    /\b(?:api_?key|secret|password|passwd|pass|token|jwt|auth_?token|credential|private_?key|database_?url)\s*[:=]\s*(?:['"]([^'"]+)['"]|([a-zA-Z0-9_\-\.\~\!\@\#\$\%\^\&\*\(\)\+]{6,})\b(?![=:]))/gi
  ];

  for (const pattern of patterns) {
    const globalRegex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g'));
    redacted = redacted.replace(globalRegex, (match, p1, p2) => {
      const val = p1 || p2;
      if (val && match.includes(val)) {
        // Only replace the actual captured secret value, not the key name
        // Use split/join to replace all exact occurrences of the secret value in the match
        const parts = match.split(val);
        return parts.join('[REDACTED_SECRET]');
      }
      return '[REDACTED_SECRET]';
    });
  }

  return redacted;
}
