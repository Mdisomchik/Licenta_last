# Sistem Modern de Management Email cu AI

**Repository:** [https://github.com/Mdisomchik/Licenta_last](https://github.com/Mdisomchik/Licenta_last)

## Descriere generală

Acest proiect reprezintă o aplicație web completă pentru managementul inteligent al emailurilor, cu funcționalități avansate de AI: sumarizare, răspunsuri automate, corectare gramaticală și căutare semantică. Aplicația folosește React și Material-UI pentru frontend, Node.js + Express pentru backend și microservicii Flask cu Hugging Face Transformers pentru procesare NLP.

---

## Structura livrabilelor

- **Cod sursă complet** (fără fișiere binare compilate)
- **Frontend:** `/src` (React, Material-UI)
- **Backend:** `/src/services` (Node.js, Express)
- **Microservicii AI:** `/venv/Scripts/Activate/summarize_api.py` (Flask, Transformers)
- **Fișiere de configurare:** `package.json`, `requirements.txt` (dacă există)
- **Documentație:** Acest fișier README

---

## Adresa repository

- **GitHub:** [https://github.com/Mdisomchik/Licenta_last](https://github.com/Mdisomchik/Licenta_last)

---

## Pași de instalare și rulare

### 1. Clonare repository

```bash
git clone https://github.com/Mdisomchik/Licenta_last.git
cd Licenta_last
```

---

### 2. Instalare dependințe Frontend

```bash
cd mail-filter-app
npm install
```

---

### 3. Instalare dependințe Backend/AI

Asigură-te că ai Python 3.8+ și pip instalat.

```bash
cd venv/Scripts/Activate
pip install -r requirements.txt
```

Dacă nu există `requirements.txt`, instalează manual:
```bash
pip install flask flask-cors transformers sentence-transformers torch langdetect
```

---

### 4. Lansare microserviciu AI (Flask)

```bash
python summarize_api.py
```
Serverul Flask va porni pe portul 5000.

---

### 5. Lansare aplicație React (Frontend)

Într-un alt terminal:

```bash
cd mail-filter-app
npm start
```
Aplicația va fi disponibilă pe [http://localhost:3000](http://localhost:3000).

---

### 6. Configurare Gmail API

- Creează un proiect pe [Google Cloud Console](https://console.cloud.google.com/)
- Activează Gmail API și OAuth 2.0
- Adaugă datele de client în aplicație (`clientId` în `App.js`)
- Permite accesul la emailuri pentru contul tău Google

---

### 7. Utilizare

- Autentifică-te cu Google
- Explorează dashboard-ul cu widget-uri
- Folosește funcționalitățile AI: sumarizare, răspunsuri, corectare, căutare semantică
- Gestionează atașamente, contacte și to-do list

---

## Autor

- Capinus Maxim
- Universitatea Politehnica Timișoara
- Automatica si Calculatoare, Informatica

---

