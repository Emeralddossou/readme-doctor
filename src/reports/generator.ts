import { AnalysisReport, Issue } from '../core/types.js';

/**
 * Generates a visual progress bar for the quality score.
 */
function getScoreBar(score: number): string {
  const blocks = Math.round(score / 10);
  const filled = '█'.repeat(blocks);
  const empty = '░'.repeat(10 - blocks);
  
  let colorEmoji = '🔴';
  if (score >= 80) colorEmoji = '🟢';
  else if (score >= 50) colorEmoji = '🟡';

  return `${colorEmoji} **${score}/100** [${filled}${empty}]`;
}

/**
 * Format a single issue into action-oriented markdown.
 */
function formatIssueMarkdown(issue: Issue): string {
  let severityEmoji = 'INFO';
  if (issue.severity === 'error') severityEmoji = 'ERROR';
  else if (issue.severity === 'warning') severityEmoji = 'WARNING';

  const lines = [
    `### [${severityEmoji}] ${issue.ruleName}`,
    `**Issue:** ${issue.message}`,
    ''
  ];

  if (issue.confidence || issue.fixType) {
    lines.push(`**Metadata:** ${[
      issue.confidence ? `confidence: ${issue.confidence}` : null,
      issue.fixType ? `fix: ${issue.fixType}` : null
    ].filter(Boolean).join(' | ')}`);
    lines.push('');
  }

  if (issue.evidence && issue.evidence.length > 0) {
    lines.push('**Evidence:**');
    for (const evidence of issue.evidence) {
      const location = evidence.file
        ? ` (${evidence.file}${evidence.line ? `:${evidence.line}` : ''})`
        : '';
      const excerpt = evidence.excerpt ? ` - \`${evidence.excerpt}\`` : '';
      lines.push(`- ${evidence.description}${location}${excerpt}`);
    }
    lines.push('');
  }

  lines.push(`**Recommendation:**\n${issue.suggestion}`);
  lines.push('');
  lines.push('---');

  return lines.join('\n');
}

/**
 * Generates a markdown report from the analysis results.
 */
export function generateMarkdownReport(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push(`# 🩺 README-Doctor Report for **${report.projectName}**`);
  lines.push(`*Generated on: ${new Date(report.timestamp).toLocaleString()}*`);
  lines.push('');

  lines.push('## 📊 Documentation Score');
  lines.push(getScoreBar(report.score));
  lines.push('');

  const errors = report.issues.filter(i => i.severity === 'error');
  const warnings = report.issues.filter(i => i.severity === 'warning');
  const infos = report.issues.filter(i => i.severity === 'info');

  lines.push(`### Summary of Findings:`);
  lines.push(`- **Critical Issues:** ${errors.length}`);
  lines.push(`- **Warnings (Inconsistencies):** ${warnings.length}`);
  lines.push(`- **Suggestions:** ${infos.length}`);
  lines.push('');

  if (report.issues.length === 0) {
    lines.push('🎉 **Perfect! No consistency issues detected. Your README perfectly matches the codebase structure.**');
    lines.push('');
  } else {
    lines.push('## 🔍 Detailed Findings');
    lines.push('');
    
    if (errors.length > 0) {
      lines.push('## 🚨 Critical Errors');
      for (const issue of errors) {
        lines.push(formatIssueMarkdown(issue));
      }
    }

    if (warnings.length > 0) {
      lines.push('## ⚠️ Warnings & Inconsistencies');
      for (const issue of warnings) {
        lines.push(formatIssueMarkdown(issue));
      }
    }

    if (infos.length > 0) {
      lines.push('## 💡 Improvements & Suggestions');
      for (const issue of infos) {
        lines.push(formatIssueMarkdown(issue));
      }
    }
  }

  if (report.summary) {
    lines.push('## 📝 Project Summary');
    lines.push(report.summary);
    lines.push('');
  }

  if (report.suggestedReadme) {
    lines.push('## 🛠️ Suggested Actions & Improvements (AI generated)');
    lines.push(report.suggestedReadme);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates a JSON report.
 */
export function generateJsonReport(report: AnalysisReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Colorizes markdown using standard ANSI terminal escape sequences.
 */
export function colorizeMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  const coloredLines = lines.map(line => {
    // Headers
    if (line.startsWith('# ')) {
      return `\x1b[1;36m${line}\x1b[0m`; // Cyan Bold
    }
    if (line.startsWith('## ')) {
      return `\x1b[1;34m${line}\x1b[0m`; // Blue Bold
    }
    if (line.startsWith('### ')) {
      let rest = line;
      if (line.includes('❌ [ERROR]')) {
        rest = line.replace('❌ [ERROR]', '\x1b[1;31m❌ [ERROR]\x1b[1;35m');
      } else if (line.includes('⚠️ [WARNING]')) {
        rest = line.replace('⚠️ [WARNING]', '\x1b[1;33m⚠️ [WARNING]\x1b[1;35m');
      } else if (line.includes('ℹ️ [INFO]')) {
        rest = line.replace('ℹ️ [INFO]', '\x1b[1;36mℹ️ [INFO]\x1b[1;35m');
      }
      return `\x1b[1;35m${rest}\x1b[0m`; // Magenta Bold
    }

    // Quality Score bar highlighting
    let formattedLine = line;
    if (formattedLine.includes('🔴')) {
      formattedLine = formattedLine.replace(/(🔴\s+\*\*.*?\*\*)/, '\x1b[1;31m$1\x1b[0m');
    } else if (formattedLine.includes('🟡')) {
      formattedLine = formattedLine.replace(/(🟡\s+\*\*.*?\*\*)/, '\x1b[1;33m$1\x1b[0m');
    } else if (formattedLine.includes('🟢')) {
      formattedLine = formattedLine.replace(/(🟢\s+\*\*.*?\*\*)/, '\x1b[1;32m$1\x1b[0m');
    }

    // Bold text replacements **foo**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    formattedLine = formattedLine.replace(boldRegex, '\x1b[1m$1\x1b[22m');

    return formattedLine;
  });
  return coloredLines.join('\n');
}
