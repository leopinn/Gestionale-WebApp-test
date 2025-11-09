const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve i file HTML/CSS/JS

// Path del file JSON
const DATABASE_DIR = path.join(__dirname, 'database');
const DATABASE_FILE = path.join(DATABASE_DIR, 'rapportini.json');
const CSV_FILE = path.join(DATABASE_DIR, 'rapportini.csv');

// Crea la cartella database se non esiste
if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR);
    console.log('✅ Cartella database creata');
}

// Crea il file JSON se non esiste
if (!fs.existsSync(DATABASE_FILE)) {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify([], null, 2));
    console.log('✅ File rapportini.json creato');
}

// Funzione per leggere i dati
function readData() {
    try {
        const data = fs.readFileSync(DATABASE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Errore lettura file:', error);
        return [];
    }
}

// Funzione per scrivere i dati
function writeData(data) {
    try {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Errore scrittura file:', error);
        return false;
    }
}

// Funzione per generare CSV
function generateCSV(interventi) {
    if (interventi.length === 0) return;

    const headers = ['Cliente', 'Data', 'Luogo', 'Ore di Lavoro', 'Descrizione', 'Importo (€)'];
    
    const escapeCSV = (text) => {
        if (!text) return '';
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };

    const rows = interventi.map(intervento => [
        escapeCSV(intervento.cliente),
        intervento.data,
        escapeCSV(intervento.luogo || ''),
        intervento.ore,
        escapeCSV(intervento.descrizione || ''),
        intervento.importo.toFixed(2)
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    fs.writeFileSync(CSV_FILE, '\ufeff' + csvContent, 'utf8');
    console.log('✅ CSV aggiornato');
}

// API ENDPOINTS

// GET - Ottieni tutti gli interventi
app.get('/api/interventi', (req, res) => {
    const interventi = readData();
    res.json({ success: true, data: interventi });
});

// POST - Salva nuovo intervento
app.post('/api/interventi', (req, res) => {
    const interventi = readData();
    const nuovoIntervento = req.body;
    
    interventi.push(nuovoIntervento);
    
    if (writeData(interventi)) {
        generateCSV(interventi);
        res.json({ success: true, message: 'Intervento salvato', data: nuovoIntervento });
    } else {
        res.status(500).json({ success: false, message: 'Errore nel salvataggio' });
    }
});

// PUT - Aggiorna intervento esistente
app.put('/api/interventi/:id', (req, res) => {
    const interventi = readData();
    const { id } = req.params;
    const interventoAggiornato = req.body;
    
    const index = interventi.findIndex(i => i.id === id);
    
    if (index !== -1) {
        interventi[index] = interventoAggiornato;
        
        if (writeData(interventi)) {
            generateCSV(interventi);
            res.json({ success: true, message: 'Intervento aggiornato', data: interventoAggiornato });
        } else {
            res.status(500).json({ success: false, message: 'Errore nell\'aggiornamento' });
        }
    } else {
        res.status(404).json({ success: false, message: 'Intervento non trovato' });
    }
});

// DELETE - Elimina intervento
app.delete('/api/interventi/:id', (req, res) => {
    const interventi = readData();
    const { id } = req.params;
    
    const nuoviInterventi = interventi.filter(i => i.id !== id);
    
    if (nuoviInterventi.length < interventi.length) {
        if (writeData(nuoviInterventi)) {
            generateCSV(nuoviInterventi);
            res.json({ success: true, message: 'Intervento eliminato' });
        } else {
            res.status(500).json({ success: false, message: 'Errore nell\'eliminazione' });
        }
    } else {
        res.status(404).json({ success: false, message: 'Intervento non trovato' });
    }
});

// GET - Scarica CSV
app.get('/api/export-csv', (req, res) => {
    if (fs.existsSync(CSV_FILE)) {
        res.download(CSV_FILE, 'rapportini.csv');
    } else {
        res.status(404).json({ success: false, message: 'File CSV non trovato' });
    }
});

// POST - Importa CSV
app.post('/api/import-csv', express.text({ type: 'text/csv' }), (req, res) => {
    try {
        const csvText = req.body;
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            return res.status(400).json({ success: false, message: 'CSV vuoto' });
        }

        const interventi = readData();
        let importedCount = 0;

        // Salta l'intestazione
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            
            if (values.length >= 6) {
                const intervento = {
                    id: `intervento_${Date.now()}_${importedCount}`,
                    cliente: values[0].replace(/^"|"$/g, ''),
                    data: values[1],
                    luogo: values[2].replace(/^"|"$/g, ''),
                    ore: parseFloat(values[3]),
                    descrizione: values[4].replace(/^"|"$/g, ''),
                    importo: parseFloat(values[5]),
                    createdAt: new Date().toISOString()
                };
                
                interventi.push(intervento);
                importedCount++;
            }
        }

        if (writeData(interventi)) {
            generateCSV(interventi);
            res.json({ success: true, message: `Importati ${importedCount} interventi` });
        } else {
            res.status(500).json({ success: false, message: 'Errore nel salvataggio' });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore nell\'importazione' });
    }
});

// Avvia il server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🚀 Server Gestionale Avviato!       ║
║                                       ║
║  📍 http://localhost:${PORT}            ║
║  📁 Database: database/rapportini.json║
║  📊 CSV: database/rapportini.csv      ║
╚═══════════════════════════════════════╝
    `);
});