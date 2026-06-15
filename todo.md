# NutriAI - Todo

## Fase 1: Setup schema DB e struttura base
- [x] Schema DB: tabelle userProfiles, mealLogs, savedRecipes
- [x] Migrazioni DB applicate
- [x] Struttura routing App.tsx con BottomNav mobile
- [x] Design system: palette verde smeraldo, font Inter + Playfair Display
- [x] BottomNav mobile con 5 tab (Home, Diario, Scan, Ricette, Profilo)

## Fase 2: Profilo utente e obiettivi
- [x] Pagina profilo: peso, altezza, età, sesso, livello attività
- [x] Calcolo TDEE automatico (formula Mifflin-St Jeor)
- [x] Selezione obiettivo: dimagrimento / massa muscolare / mantenimento
- [x] Calcolo macro giornalieri automatico in base all'obiettivo
- [x] Modifica manuale macro target
- [x] MacroRing e MacroBar componenti per visualizzazione

## Fase 3: Riconoscimento cibo
- [x] Scatto foto da fotocamera smartphone
- [x] Upload foto e analisi AI Vision (riconoscimento cibo)
- [x] Calcolo calorie e macro dal cibo riconosciuto
- [x] Correzione manuale nome cibo e grammatura
- [x] Ricerca manuale cibo tramite testo
- [x] Scanner barcode per cibi confezionati (html5-qrcode)
- [x] Lettura valori nutrizionali da barcode

## Fase 4: Diario alimentare
- [x] Log pasti giornalieri: colazione, pranzo, cena, spuntini
- [x] Aggiunta pasto al diario dal riconoscimento foto/ricerca/barcode
- [x] Riepilogo calorie consumate vs obiettivo
- [x] Riepilogo macro consumati vs obiettivo
- [x] Eliminazione voci dal diario
- [x] Navigazione per data (giorno precedente/successivo)
- [x] Pulsante accesso rapido allo storico dall'header Diary

## Fase 5: Storico e grafici
- [x] Vista storico settimanale calorie
- [x] Vista storico mensile calorie
- [x] Grafici andamento macro nel tempo (recharts AreaChart + BarChart)
- [x] Riepilogo statistiche medie settimanali/mensili
- [x] Pulsante back in History verso Diary

## Fase 6: Generatore ricette AI
- [x] Pagina generatore ricette con tab Genera / Salvate
- [x] Generazione ricetta AI basata su macro rimanenti del giorno
- [x] Ricetta con ingredienti e grammature precise
- [x] Valori nutrizionali totali della ricetta
- [x] Salvataggio ricette preferite

## Fase 7: UI/UX e rifinitura
- [x] Design mobile-first raffinato e coerente
- [x] Animazioni e micro-interazioni (press-effect, transizioni)
- [x] Stati di caricamento e scheletri
- [x] Gestione errori e stati vuoti
- [x] Fix getUserProfile: null invece di undefined (React Query compat)
- [x] Test vitest backend (9 test passati)
- [x] TypeScript senza errori
- [x] Checkpoint finale

## Railway Deploy
- [ ] Analisi dipendenze Manus-specifiche (LLM, storage, auth, notification)
- [ ] Sostituzione invokeLLM con OpenAI SDK standard
- [ ] Sostituzione storagePut con Cloudinary o S3 standard
- [ ] Sostituzione OAuth Manus con sistema JWT + email/password
- [ ] Configurazione nixpacks.toml per Railway
- [ ] Script build e start per produzione
- [ ] File .env.example con tutte le variabili necessarie
- [ ] Istruzioni deploy Railway complete
- [ ] Pacchetto ZIP pronto per il deploy
