# Guida al Deploy di NutriAI su Railway

Questa guida ti porta dal codice sorgente a un'app live su Railway in circa 15 minuti.

---

## Prerequisiti

- Account su [Railway](https://railway.app) (gratuito)
- Account su [GitHub](https://github.com) (gratuito)
- Chiave API OpenAI — ottienila su [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## Passo 1 — Carica il codice su GitHub

1. Crea un nuovo repository su GitHub (privato o pubblico)
2. Carica tutti i file di questa cartella nel repository:
   ```bash
   cd nutriai-railway
   git init
   git add .
   git commit -m "NutriAI - primo commit"
   git remote add origin https://github.com/TUO-USERNAME/nutriai.git
   git push -u origin main
   ```

---

## Passo 2 — Crea il progetto su Railway

1. Vai su [railway.app](https://railway.app) e accedi
2. Clicca **New Project**
3. Seleziona **Deploy from GitHub repo**
4. Autorizza Railway ad accedere al tuo GitHub e seleziona il repository `nutriai`
5. Railway rileverà automaticamente la configurazione `nixpacks.toml`

---

## Passo 3 — Aggiungi il database MySQL

1. Nel progetto Railway, clicca **+ New Service**
2. Seleziona **Database → MySQL**
3. Railway creerà automaticamente un database e imposterà la variabile `DATABASE_URL`

---

## Passo 4 — Configura le variabili d'ambiente

Nel pannello del tuo servizio NutriAI, vai su **Variables** e aggiungi:

| Variabile | Valore | Note |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | **Obbligatoria** — da platform.openai.com |
| `JWT_SECRET` | stringa casuale | Genera con: `openssl rand -hex 32` |
| `OPENAI_MODEL` | `gpt-4o` | Oppure `gpt-4o-mini` per risparmiare |
| `NODE_ENV` | `production` | Obbligatoria |
| `CLOUDINARY_CLOUD_NAME` | nome cloud | **Opzionale** — per salvare le foto |
| `CLOUDINARY_API_KEY` | chiave API | **Opzionale** |
| `CLOUDINARY_API_SECRET` | segreto API | **Opzionale** |

> **Nota:** `DATABASE_URL` viene impostata automaticamente da Railway quando aggiungi il plugin MySQL.

---

## Passo 5 — Inizializza il database

Dopo il primo deploy, devi creare le tabelle del database. Hai due opzioni:

### Opzione A: tramite Railway CLI (consigliata)
```bash
# Installa Railway CLI
npm install -g @railway/cli

# Accedi
railway login

# Esegui la migrazione
railway run pnpm drizzle-kit migrate
```

### Opzione B: manualmente
Copia il contenuto del file `drizzle/migrations/0000_initial.sql` (o il file più recente) e incollalo nel pannello **Query** del database MySQL su Railway.

---

## Passo 6 — Deploy

Railway fa il deploy automaticamente ad ogni push su `main`. Il primo deploy richiede 2-3 minuti.

Una volta completato, trovi l'URL pubblico nella sezione **Settings → Domains** del servizio.

---

## Struttura dei costi su Railway

| Servizio | Piano Free | Note |
|---|---|---|
| App Node.js | 500 ore/mese gratis | Sufficiente per uso personale |
| MySQL | 1GB gratis | Sufficiente per mesi di utilizzo |
| Banda | 100GB/mese gratis | Ampiamente sufficiente |

> Il piano gratuito di Railway è sufficiente per uso personale. Con utilizzo intenso potresti aver bisogno del piano Hobby a $5/mese.

---

## Costi OpenAI (stima)

| Utilizzo | Costo stimato |
|---|---|
| 10 foto/giorno (GPT-4o) | ~$0.30/mese |
| 10 foto/giorno (GPT-4o-mini) | ~$0.03/mese |
| 5 ricette AI/giorno | ~$0.10/mese |

> Consiglio: usa `gpt-4o-mini` impostando `OPENAI_MODEL=gpt-4o-mini` per ridurre i costi di ~10x con qualità leggermente inferiore.

---

## Aggiornamenti futuri

Per aggiornare l'app dopo modifiche al codice:
```bash
git add .
git commit -m "Descrizione delle modifiche"
git push
```
Railway farà il redeploy automaticamente.

---

## Supporto

Per problemi con Railway: [docs.railway.app](https://docs.railway.app)
Per problemi con OpenAI: [platform.openai.com/docs](https://platform.openai.com/docs)
