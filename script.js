// Configurazione API del database
const API_URL = 'http://localhost:30000/api';

// Stato applicazione
let lista_rapportini = [];      // Lista principale di tutti i rapportini
let editingId = null;

// ******************************************************
// **** PRENDO GLI ID DI TUTTI GLI ELEMENTI - INIZIO ****
// ******************************************************

// Elementi DOM
const homePage = document.getElementById('homePage');
const pagina_rapportini = document.getElementById('pagina_rapportini');
const btn_vai_a_rapportini = document.getElementById('vai_a_rapportini');
const btn_vai_a_home = document.getElementById('vai_a_home');

// Elementi del rapportino
const iv_cliente = document.getElementById('cliente');
const iv_data = document.getElementById('data');
const iv_luogo = document.getElementById('luogo');
const iv_ore = document.getElementById('ore');
const iv_descrizione = document.getElementById('descrizione');
const iv_importo = document.getElementById('importo');
const btn_salva = document.getElementById('btn_salva');
const btn_cancella = document.getElementById('btn_cancella');
const iv_titolo = document.getElementById('iv_titolo');

// CSV elements
const btn_export_csv = document.getElementById('btn_export_csv');
const btn_import_csv = document.getElementById('btn_import_csv');
const file_input = document.getElementById('file_input');

// Altri elementi
const cerca_rapportino = document.getElementById('cerca_rapportino');
const interventi_lista = document.getElementById('interventi_lista');
const totale_interventi = document.getElementById('totale_interventi');
const totale_ore = document.getElementById('totale_ore');
const totale_fatturato = document.getElementById('totale_fatturato');

// ******************************************************
// **** PRENDO GLI ID DI TUTTI GLI ELEMENTI - FINE ****
// ******************************************************



// ************************************************
// **** DICHIARAZIONI METODI E EVENTI - INIZIO ****
// ************************************************

// Navigazione
btn_vai_a_rapportini.addEventListener('click', () => {
    homePage.classList.remove('active');
    pagina_rapportini.classList.add('active');
});

btn_vai_a_home.addEventListener('click', () => {
    pagina_rapportini.classList.remove('active');
    homePage.classList.add('active');
    updateStats();
});

btn_salva.addEventListener('click', salva_rapportino);      // Salva rapportino
btn_cancella.addEventListener('click', reset_rapportino);   // Cancella rapportino

// Ricerca
cerca_rapportino.addEventListener('input', (e) => {
    renderInterventi(e.target.value);
});

// CSV Export/Import
btn_export_csv.addEventListener('click', exportToCSV);
btn_import_csv.addEventListener('click', file_input.click());
file_input.addEventListener('change', importFromCSV);

// ************************************************
// **** DICHIARAZIONI METODI E EVENTI - FINE ****
// ************************************************


// Carica dati all'apertura del sito
inizializza_rapportini();


// FUNZIONI API
async function inizializza_rapportini() {
    try {
        const response = await fetch(`${API_URL}/interventi`);
        const result = await response.json();
        
        if (result.success) {
            lista_rapportini = result.data;
            renderInterventi();
            updateStats();
        } else {
            console.error('Errore nel caricamento');
            alert('Errore nel caricamento dei dati. Assicurati che il server sia avviato.');
        }
    } catch (error) {
        console.error('Errore connessione:', error);
        alert('Impossibile connettersi al server. Avvia il server con: node server.js');
    }
}

async function salva_rapportino() {
    // Validazione
    if (!iv_cliente.value.trim() || !iv_data.value || !iv_ore.value || !iv_importo.value) {
        alert('Compila tutti i campi obbligatori (Cliente, Data, Ore, Importo)');
        return;
    }

    const intervento = {
        id: editingId || `intervento_${Date.now()}`,
        cliente: iv_cliente.value.trim(),
        data: iv_data.value,
        luogo: iv_luogo.value.trim(),
        ore: parseFloat(iv_ore.value),
        descrizione: iv_descrizione.value.trim(),
        importo: parseFloat(iv_importo.value),
        createdAt: new Date().toISOString()
    };

    try {
        let response;
        
        if (editingId) {
            // Aggiorna esistente
            response = await fetch(`${API_URL}/interventi/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(intervento)
            });
        } else {
            // Crea nuovo
            response = await fetch(`${API_URL}/interventi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(intervento)
            });
        }

        const result = await response.json();
        
        if (result.success) {
            alert(editingId ? 'Intervento aggiornato con successo!' : 'Intervento salvato con successo!');
            reset_rapportino();
            await inizializza_rapportini();
        } else {
            alert('Errore nel salvataggio: ' + result.message);
        }
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nella comunicazione con il server');
    }
}

async function deleteIntervento(id) {
    if (!confirm('Sei sicuro di voler eliminare questo intervento?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/interventi/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Intervento eliminato con successo!');
            await inizializza_rapportini();
        } else {
            alert('Errore nell\'eliminazione: ' + result.message);
        }
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nella comunicazione con il server');
    }
}

function editIntervento(intervento) {
    editingId = intervento.id;
    iv_cliente.value = intervento.cliente;
    iv_data.value = intervento.data;
    iv_luogo.value = intervento.luogo || '';
    iv_ore.value = intervento.ore;
    iv_descrizione.value = intervento.descrizione || '';
    iv_importo.value = intervento.importo;
    
    iv_titolo.textContent = 'Modifica Intervento';
    btn_salva.textContent = 'Aggiorna Intervento';
    btn_cancella.style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function reset_rapportino() {
    editingId = null;
    iv_cliente.value = '';
    iv_data.value = '';
    iv_luogo.value = '';
    iv_ore.value = '';
    iv_descrizione.value = '';
    iv_importo.value = '';
    
    iv_titolo.textContent = 'Nuovo Intervento';
    btn_salva.textContent = 'Salva Intervento';
    btn_cancella.style.display = 'none';
}

function renderInterventi(searchTerm = '') {
    const filteredInterventi = searchTerm 
        ? lista_rapportini.filter(i => 
            i.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.luogo && i.luogo.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : lista_rapportini;

    if (filteredInterventi.length === 0) {
        interventi_lista.innerHTML = `
            <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <p class="empty-text">Nessun intervento trovato</p>
            </div>
        `;
        return;
    }

    // Ordina per data (più recenti prima)
    const sortedInterventi = [...filteredInterventi].sort((a, b) => 
        new Date(b.data) - new Date(a.data)
    );

    interventi_lista.innerHTML = sortedInterventi.map(intervento => `
        <div class="intervento-card">
            <div class="intervento-header">
                <div class="intervento-info">
                    <h3>${intervento.cliente}</h3>
                    <div class="intervento-meta">
                        <span class="meta-item">
                            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            ${formatDate(intervento.data)}
                        </span>
                        ${intervento.luogo ? `
                        <span class="meta-item">
                            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            ${intervento.luogo}
                        </span>
                        ` : ''}
                        <span class="meta-item">
                            <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${intervento.ore}h
                        </span>
                    </div>
                </div>
                <div class="intervento-price">
                    €${intervento.importo.toFixed(2)}
                </div>
            </div>
            
            ${intervento.descrizione ? `
            <div class="intervento-description">
                ${intervento.descrizione}
            </div>
            ` : ''}
            
            <div class="intervento-actions">
                <button class="btn-edit" onclick="editInterventoById('${intervento.id}')">
                    <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Modifica
                </button>
                <button class="btn-delete" onclick="deleteInterventoById('${intervento.id}')">
                    <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Elimina
                </button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const loc_totale_interventi = lista_rapportini.length;
    const loc_totale_ore = lista_rapportini.reduce((sum, i) => sum + (i.ore || 0), 0);
    const loc_totale_fatturato = lista_rapportini.reduce((sum, i) => sum + (i.importo || 0), 0);

    totale_interventi.textContent = loc_totale_interventi;
    totale_ore.textContent = `${loc_totale_ore.toFixed(1)}h`;
    totale_fatturato.textContent = `€${loc_totale_fatturato.toFixed(2)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// FUNZIONI CSV

async function exportToCSV() {
    try {
        const response = await fetch(`${API_URL}/export-csv`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `rapportini_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            window.URL.revokeObjectURL(url);
            alert('CSV esportato con successo!');
        } else {
            alert('Errore nell\'esportazione del CSV');
        }
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nella comunicazione con il server');
    }
}

async function importFromCSV(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }

    if (!file.name.endsWith('.csv')) {
        alert('Per favore seleziona un file CSV valido!');
        return;
    }

    try {
        const text = await file.text();
        
        const response = await fetch(`${API_URL}/import-csv`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/csv' },
            body: text
        });

        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            await inizializza_rapportini();
        } else {
            alert('Errore nell\'importazione: ' + result.message);
        }

        file_input.value = '';
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nella lettura del file CSV');
    }
}

// Funzioni globali per onclick
window.editInterventoById = function(id) {
    const intervento = lista_rapportini.find(i => i.id === id);
    if (intervento) {
        editIntervento(intervento);
    }
};

window.deleteInterventoById = function(id) {
    deleteIntervento(id);
};