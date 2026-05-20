# 🩺 README-Doctor

> **Gardez votre documentation vivante, cohérente et parfaitement synchronisée avec votre base de code.**

README-Doctor est un outil de développement professionnel, local-first, qui audite votre dépôt, compare la documentation (README) avec votre base de code réelle, identifie les commandes obsolètes, les variables d'environnement non documentées, et utilise des modèles d'IA optionnels pour résumer ou suggérer des corrections de documentation très pertinentes.

---

## ⚡ Fonctionnalités Clés

*   **🔍 Analyse Statique Local-First** : Analyse les scripts npm et scanne le code source pour extraire les variables d'environnement utilisées, le tout avec **zéro exécution de code** pour une sécurité maximale.
*   **🩺 Diagnostics en Temps Réel** : Compare instantanément les métadonnées découvertes avec les commandes et les définitions présentes dans votre README.
*   **🤖 Couche d'IA Interchangeable** : Utilise **Gemini (Tier Gratuit)** ou **Groq** via l'API fetch native et légère de Node pour expliquer les problèmes, résumer les projets et rédiger des fichiers README de qualité supérieure.
*   **🛡️ Confidentialité & Masquage Local** : Supprime strictement toutes les clés API, secrets et identifiants localement avant qu'ils n'atteignent un service d'IA externe.
*   **📊 Rapports Complets** : Génère une sortie console Markdown très lisible et des rapports JSON exploitables par machine.

---

## 🛠️ Installation

```bash
# Cloner le dépôt
git clone https://github.com/your-username/readme-doctor.git
cd readme-doctor

# Installer les dépendances
npm install

# Compiler le projet
npm run build
```

---

## ⚙️ Configuration

README-Doctor fonctionne parfaitement en mode local uniquement. Pour débloquer les résumés avancés alimentés par l'IA et les corrections automatiques, déclarez l'une des variables d'environnement suivantes dans un fichier `.env` à la racine de votre projet :

```env
# Configuration de l'API Google Gemini (Recommandé / Tier Gratuit)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# OU Configuration de l'API Groq LLaMA
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

---

## 🚀 Utilisation

Vous pouvez lancer README-Doctor directement depuis l'exécutable compilé :

### 1. Scanner votre projet pour les incohérences
Audite votre README.md par rapport aux scripts de la base de code et aux variables d'environnement.
```bash
npm start -- scan ./
```
*Options :*
*   `-j, --json` : Génère le rapport au format JSON.
*   `-o, --output <file>` : Enregistre le rapport dans un fichier.
*   `--no-ai` : Exécute en mode local uniquement, en contournant tout fournisseur d'IA configuré.

### 2. Générer un résumé de projet intelligent (IA uniquement)
```bash
npm start -- summarize ./
```

### 3. Corriger automatiquement les incohérences du README (IA uniquement)
```bash
npm start -- fix ./
```

### 4. Initialiser un modèle de README premium (IA uniquement)
Génère un modèle complet adapté à la structure et aux paramètres de la base de code.
```bash
npm start -- init ./
```

---

## 🧪 Exécution des Tests

Nous maintenons une suite robuste de tests unitaires vérifiant toutes les règles locales, les analyseurs et les filtres de sécurité :

```bash
# Exécuter les tests une fois
npm run test

# Exécuter les tests en mode surveillance
npm run test:watch
```

---

## 📜 Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.
