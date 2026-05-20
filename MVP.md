# README-Doctor
## Architecture sécurisée et solide pour un MVP

Ce document décrit une architecture réaliste, sûre et évolutive pour lancer **README-Doctor** avec un **MVP solide**.

L’objectif n’est pas de construire une usine à gaz. L’objectif est de livrer un noyau utile, fiable, maintenable, et déjà crédible pour un projet open source.

---

## 1. Objectif du MVP

Le MVP doit permettre à un utilisateur de :

- scanner un dépôt local ou un dépôt GitHub cloné en local ;
- détecter la présence et l’état du README ;
- comparer le README avec le codebase et les fichiers de config ;
- signaler les incohérences les plus importantes ;
- proposer des corrections concrètes ;
- générer un résumé simple du projet ;
- préparer une base de README si aucun fichier n’existe.

Le MVP doit être **fiable avant d’être spectaculaire**.

---

## 2. Choix de conception généraux

### 2.1 Principe central : local-first

Le logiciel doit analyser le dépôt **en local autant que possible**.

Pourquoi :
- meilleur contrôle de la sécurité ;
- réduction des données envoyées à un service externe ;
- fonctionnement plus rassurant pour les mainteneurs ;
- meilleure compatibilité avec les dépôts privés ;
- meilleure maîtrise du coût.

### 2.2 IA comme couche d’assistance, pas comme cerveau unique

L’IA ne doit pas tout inventer. Elle doit :
- résumer ce que l’analyse locale a déjà découvert ;
- reformuler proprement ;
- proposer des améliorations ;
- générer des variantes de texte ;
- aider à la traduction.

Les décisions importantes doivent rester fondées sur des signaux observables du dépôt.

### 2.3 Architecture modulaire

Le projet doit être découpé en modules clairs pour éviter le chaos :
- scanner du dépôt ;
- extracteur de contexte ;
- analyseur de README ;
- moteur de règles ;
- moteur IA ;
- générateur de rapport ;
- exporteur de patchs ou de fichiers.

---

## 3. Stack recommandée pour le MVP

### 3.1 Langage principal

**TypeScript**.

Pourquoi :
- excellent pour un CLI + API + intégration GitHub ;
- très bon écosystème pour manipuler fichiers, markdown, Git, YAML, JSON ;
- facile à adopter par la communauté open source ;
- bonne lisibilité du code ;
- très bon compromis entre vitesse de développement et robustesse.

### 3.2 Interface principale

**CLI** en premier.

Pourquoi :
- c’est la façon la plus simple de valider la valeur du produit ;
- faible coût de dev ;
- facile à automatiser dans CI ;
- facile à tester ;
- très open source friendly.

Exemples de commandes :
- `readme-doctor scan`
- `readme-doctor report`
- `readme-doctor summarize`
- `readme-doctor init`
- `readme-doctor fix`

### 3.3 API

Une API légère peut venir ensuite, mais elle n’est pas prioritaire pour le MVP.

### 3.4 Stockage

Pour le MVP :
- stockage local des rapports en JSON/Markdown ;
- éventuellement SQLite pour l’historique minimal.

Pas besoin d’une base lourde au début.

---

## 4. Architecture fonctionnelle

## 4.1 Vue d’ensemble

Le pipeline peut ressembler à ceci :

1. **Entrée** : dépôt local ou chemin vers un repo cloné.
2. **Scan** : détection des fichiers et de l’arborescence.
3. **Extraction** : lecture des fichiers importants.
4. **Analyse** : comparaison README ↔ codebase.
5. **Règles** : détection d’incohérences connues.
6. **IA** : reformulation, synthèse, suggestions.
7. **Sortie** : rapport, résumé, patch, README généré.

---

## 5. Modules internes recommandés

### 5.1 Module de découverte du dépôt

Responsabilité : repérer les fichiers clés.

Exemples de signaux :
- `README.md`, `README.fr.md`, `README.en.md` ;
- `package.json` ;
- `pyproject.toml` ;
- `requirements.txt` ;
- `Cargo.toml` ;
- `go.mod` ;
- `pom.xml` ;
- `docker-compose.yml` ;
- `.env.example` ;
- `.github/workflows/*` ;
- dossiers `src`, `app`, `backend`, `frontend`, `docs`.

Ce module ne doit pas faire de magie. Il doit juste collecter les faits.

### 5.2 Module d’extraction du contexte

Responsabilité : transformer la structure du dépôt en données utiles.

Il doit extraire :
- nom du projet ;
- type de projet ;
- scripts disponibles ;
- commandes de build ;
- commandes de test ;
- variables d’environnement ;
- dépendances importantes ;
- points d’entrée ;
- fichiers de config ;
- sections documentées ou manquantes.

### 5.3 Module d’analyse du README

Responsabilité : découper le README en blocs et comprendre sa structure.

Exemples de blocs :
- introduction ;
- installation ;
- usage ;
- configuration ;
- contribution ;
- licence ;
- FAQ ;
- exemples ;
- traduction.

### 5.4 Module de règles

Responsabilité : détecter les incohérences simples et fiables.

Exemples de règles :
- le README mentionne une commande absente des scripts ;
- le README parle d’un fichier qui n’existe plus ;
- une variable d’environnement est utilisée dans le code mais pas documentée ;
- une nouvelle fonctionnalité récente n’apparaît pas dans la doc ;
- un fichier README traduit est en retard par rapport au README principal.

### 5.5 Module IA

Responsabilité : produire des textes utiles à partir des constats.

L’IA doit servir à :
- expliquer simplement ;
- proposer des formulations plus claires ;
- générer des sections manquantes ;
- résumer un projet ;
- adapter le niveau de détail ;
- proposer des traductions.

L’IA ne doit pas inventer des commandes ou des fonctionnalités non observées.

### 5.6 Module de sortie

Responsabilité : produire les livrables finaux.

Formats possibles :
- rapport Markdown ;
- rapport JSON ;
- README proposé ;
- diff suggéré ;
- résumé court ;
- rapport multilingue.

---

## 6. Sécurité : choix concrets

La sécurité doit être intégrée dès le départ, même pour un MVP.

### 6.1 Ne jamais exécuter de code du dépôt

Très important : le scanner ne doit **pas exécuter** le projet analysé.

Il doit seulement :
- lire les fichiers ;
- analyser la structure ;
- interpréter les configs ;
- comparer les textes.

Ça évite les gros ennuis bêtes.

### 6.2 Minimisation des données envoyées à l’IA

Le moteur IA ne doit recevoir que :
- les extraits utiles du README ;
- les métadonnées nécessaires ;
- les erreurs ou incohérences détectées ;
- des résumés du contexte local.

Il ne faut pas envoyer tout le dépôt par défaut.

### 6.3 Masquage des secrets

Avant tout appel IA, le système doit filtrer :
- clés API ;
- tokens ;
- mots de passe ;
- variables sensibles ;
- contenus manifestement secrets dans `.env` ou fichiers similaires.

Le scan doit reconnaître les patterns de secrets connus et les exclure.

### 6.4 Mode privé par défaut

Le comportement par défaut doit être :
- analyse locale ;
- envoi externe limité ;
- opt-in explicite pour toute fonctionnalité cloud plus intrusive.

### 6.5 Permissions strictes

Si le projet devient une GitHub Action ou une intégration CI :
- permissions minimales ;
- accès limité au contenu nécessaire ;
- aucun write access inutile ;
- pas de publication automatique sans validation.

---

## 7. Stratégie IA recommandée

## 7.1 Mon avis sur Groq

Groq est un **très bon choix de départ** si tu veux :
- une API simple à intégrer ;
- une compatibilité de type OpenAI ;
- une inference très rapide ;
- un point d’entrée agréable pour un MVP.

Les docs Groq montrent une compatibilité OpenAI via une base URL de type OpenAI, et leurs modèles production incluent notamment `llama-3.1-8b-instant` et `llama-3.3-70b-versatile`. Les pages officielles indiquent aussi un “get started for free” côté pricing. ([console.groq.com](https://console.groq.com/docs/overview))

### Ce que ça implique concrètement
- très simple à brancher dans une CLI ;
- peu de friction d’intégration ;
- bon pour les résumés et corrections textuelles ;
- bon pour un prototype rapide.

### Limite à connaître
Groq est excellent pour aller vite, mais il faut rester attentif aux changements de modèles, de tarifs et de disponibilité. Les docs officielles montrent déjà des pages de dépréciation de modèles, donc il vaut mieux éviter de bétonner le MVP sur un seul modèle fragile à long terme. ([console.groq.com](https://console.groq.com/docs/deprecations?utm_source=chatgpt.com))

---

## 7.2 Est-ce qu’il y a mieux ?

Pour un projet gratuit, **Gemini API** est une alternative sérieuse à regarder, parce que Google documente clairement un **Free Tier** avec accès à certains modèles, et les pages officielles indiquent que les nouveaux comptes commencent sur ce Free Tier. ([ai.google.dev](https://ai.google.dev/gemini-api/docs/billing))

Les docs Google indiquent aussi que certains modèles ont un usage gratuit dans le Free Tier, et les pages de modèles montrent que les familles **Flash-Lite** sont pensées pour l’efficacité et le volume. ([ai.google.dev](https://ai.google.dev/gemini-api/docs/models?utm_source=chatgpt.com))

### Mon avis pratique
- **Groq** : excellent pour la vitesse et la simplicité d’intégration.
- **Gemini Free Tier** : très intéressant pour une alternative gratuite mieux cadrée côté accès à certains modèles.

Pour un MVP de documentation, le bon choix n’est pas forcément le modèle “le plus fort”, mais celui qui produit un bon texte rapidement et à coût nul ou quasi nul.

---

## 7.3 Quel modèle gratuit est le plus adapté ?

### Option 1 — Groq : `llama-3.1-8b-instant`
C’est le candidat le plus raisonnable pour démarrer si tu pars sur Groq :
- rapide ;
- léger ;
- suffisant pour du résumé, du repérage d’incohérences et des reformulations simples ;
- adapté à un MVP qui doit rester économique et réactif. ([console.groq.com](https://console.groq.com/docs/models))

### Option 2 — Gemini : `gemini-2.5-flash` ou `gemini-2.5-flash-lite`
Pour un usage gratuit, les docs Gemini mettent en avant les modèles **Flash-Lite** comme les plus rapides et les plus économiques de leur famille, et la pricing page confirme l’existence d’un Free Tier pour certains modèles. ([ai.google.dev](https://ai.google.dev/gemini-api/docs/models?utm_source=chatgpt.com))

### Mon choix recommandé
Pour le MVP :
- **si tu veux une intégration ultra simple et rapide** : Groq + `llama-3.1-8b-instant` ;
- **si tu veux maximiser la disponibilité gratuite documentée** : Gemini Free Tier avec un modèle Flash-Lite/Flash selon disponibilité.

### Verdict franc
Si ton objectif principal est de sortir vite une base solide, **Groq est un bon premier choix**. Si ton objectif principal est de tenir plus confortablement sur du gratuit avec des options clairement documentées, **Gemini mérite d’être le plan B sérieux**, voire le plan A selon les quotas que tu constates dans ton compte.

---

## 8. Stratégie de prompting

Le prompt système doit être très cadré.

### Règles pour l’IA
- ne pas inventer de commandes ;
- ne pas supposer des fichiers absents ;
- signaler ce qui est une hypothèse ;
- distinguer les faits observés des suggestions ;
- adapter la sortie au mode demandé : audit, résumé, correction, traduction.

### Types de sortie demandés à l’IA
- **Audit** : liste des problèmes ;
- **Correction** : propositions précises ;
- **Résumé** : version courte ;
- **Génération** : README initial ;
- **Traduction** : version fidèle et claire.

---

## 9. Format des rapports

Le MVP doit générer un rapport lisible et actionnable.

### Exemple de structure de rapport
- état général ;
- score de confiance ;
- problèmes critiques ;
- incohérences détectées ;
- sections manquantes ;
- suggestions de réécriture ;
- versions traduites à corriger ;
- résumé du projet ;
- README proposé si absent.

---

## 10. Pipeline concret d’exécution

### Mode `scan`
1. lecture du dossier ;
2. repérage des fichiers importants ;
3. extraction des scripts et configs ;
4. parsing du README ;
5. comparaison ;
6. score et rapport.

### Mode `summarize`
1. lecture du README ;
2. extraction des sections clés ;
3. adaptation au niveau demandé ;
4. génération d’un résumé en quelques lignes.

### Mode `fix`
1. détection des problèmes ;
2. génération de corrections ;
3. création d’un patch ou d’un README réécrit ;
4. export du résultat.

### Mode `init`
1. identification du type de projet ;
2. génération d’une structure de README ;
3. insertion des sections recommandées ;
4. export d’un fichier prêt à affiner.

---

## 11. Gestion des langues

Pour le MVP, il faut rester simple :

- détecter la langue principale ;
- détecter les fichiers de traduction existants ;
- comparer leur structure ;
- signaler les écarts ;
- proposer une version traduite cohérente.

Le système ne doit pas prétendre “traduire parfaitement” dès le jour 1. Il doit surtout aider à maintenir la cohérence.

---

## 12. Résumé de l’architecture retenue

### Recommandation MVP
- **CLI TypeScript** ;
- **analyse locale d’abord** ;
- **IA externe en couche de suggestion** ;
- **Groq comme premier backend IA possible** ;
- **Gemini Free Tier comme alternative solide** ;
- **rapport Markdown + JSON** ;
- **pas d’exécution du code du dépôt** ;
- **masquage des secrets** ;
- **fonctionnement modulaire**.

---

## 13. Roadmap de construction

### Étape 1
Créer le scanner local et le parseur README.

### Étape 2
Ajouter les règles d’incohérence simples.

### Étape 3
Brancher l’IA pour les résumés et les suggestions.

### Étape 4
Ajouter la génération d’un README de base.

### Étape 5
Ajouter la gestion multilingue.

### Étape 6
Ajouter l’export de patchs et la compatibilité CI/GitHub Action.

### Étape 7
Améliorer les scores, l’observabilité et les tests.

---

## 14. Ce qu’il faut absolument éviter

- vouloir tout faire tout de suite ;
- envoyer le dépôt entier à l’IA sans filtrage ;
- exécuter du code du dépôt ;
- rendre l’outil dépendant d’un seul modèle fragile ;
- produire des suggestions sans preuve ;
- sur-architecturer le MVP.

---

## 15. Conclusion

Cette architecture permet de lancer README-Doctor avec une base sérieuse, sécurisée et réaliste.

Le bon équilibre est le suivant :
- analyse locale forte ;
- IA utile mais contrôlée ;
- sortie claire et vérifiable ;
- intégration simple ;
- futur extensible.

En clair : on commence proprement, on reste raisonnable, et on garde assez de souplesse pour faire évoluer l’outil vers une vraie référence de documentation intelligente.

