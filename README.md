# 🩺 README-Doctor

> **Keep your documentation alive, consistent, and perfectly synced with your codebase.**

README-Doctor is a professional, local-first developer tool that audits your repository, compares documentation (README) against your actual codebase, identifies outdated commands, undocumented environment variables, and utilizes optional AI models to summarize or suggest highly relevant documentation fixes.

---

## ⚡ Key Features

*   **🔍 Local-First Static Analysis**: Parses npm scripts and scans source code to extract used environment variables, all with **zero code execution** for maximum safety.
*   **🩺 Real-Time Diagnostics**: Instantly compares discovered metadata against commands and definitions inside your README.
*   **🤖 Interchangeable AI layer**: Uses **Gemini (Free Tier)** or **Groq** via Node's native lightweight fetch API to explain issues, summarize projects, and draft premium README files.
*   **🛡️ Local Privacy & Masking**: Strictly redacts all API keys, secrets, and credentials locally before they ever reach an external AI service.
*   **📊 Comprehensive Reports**: Generates highly readable Markdown console output and machine-friendly JSON reports.

---

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/Emeralddossou/readme-doctor.git
cd readme-doctor

# Install dependencies
npm install

# Build the project
npm run build
```

---

## ⚙️ Configuration

README-Doctor operates perfectly in local-only mode. To unlock advanced AI-powered summaries and automatic fixes, declare one of the following environment variables in a `.env` file at the root of your project:

```env
# Google Gemini API Configuration (Recommended / Free Tier)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# OR Groq LLaMA API Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

---

## 🚀 Usage

You can launch README-Doctor directly from the built executable:

### 1. Scan your project for inconsistencies
Audits your README.md against codebase scripts and environment variables.
```bash
npm start -- scan ./
```
Or
```bash
npm start -- scan ./../local/path/to/your/codebase
```
*Options:*
*   `-j, --json` : Outputs report in JSON format.
*   `-o, --output <file>` : Saves report to a file.
*   `-q, --quiet` : Suppresses progress logs.
*   `--no-ai` : Runs in local-only mode, bypassing any configured AI provider.

### 2. Generate an intelligent project summary
Works locally by default and uses AI when a provider is configured.
```bash
npm start -- summarize ./
```

### 3. Propose README fixes
Produces deterministic local fixes and enriches them with AI when available.
```bash
npm start -- fix ./
```

### 4. Initialize a README template
Generates a complete template tailored to the codebase structure and settings. It works locally, with optional AI enhancement.
```bash
npm start -- init ./
```

---

## 🧪 Running Tests

We maintain a robust suite of unit tests verifying all local rules, parsers, and security filters:

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

---

## Contributing

Contributions are welcome. Please open an issue for bugs or proposals, and include tests when changing scanner behavior, analysis rules, CLI output, or security-related code.

---

## License

This project is licensed under the GNU General Public License - see the LICENSE file for details.
