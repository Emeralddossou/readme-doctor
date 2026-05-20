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
git clone https://github.com/your-username/readme-doctor.git
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
*Options:*
*   `-j, --json` : Outputs report in JSON format.
*   `-o, --output <file>` : Saves report to a file.
*   `--no-ai` : Runs in local-only mode, bypassing any configured AI provider.

### 2. Generate an intelligent project summary (AI-only)
```bash
npm start -- summarize ./
```

### 3. Automatically fix README inconsistencies (AI-only)
```bash
npm start -- fix ./
```

### 4. Initialize a premium README template (AI-only)
Generates a complete template tailored to the codebase structure and settings.
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

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
