// Configurazione API
const API_URL = 'http://192.168.0.6:25565/api';

// Stato applicazione
let interventi = [];
let editingId = null;

// Elementi DOM
const homePage = document.getElementById('homePage');
const rapportiniPage = document.getElementById('rapportiniPage');
const goToRapportiniBtn = document.getElementById('goToRapportini');
const goToHomeBtn = document.getElementById('goToHome');

// Form elements
const clienteInput = document.getElementById('cliente');
const dataInput = document.getElementById('data');
const luogoInput = document.getElementById('luogo');
const oreInput = document.getElementById('ore');
const descrizioneInput = document.getElementById('descrizione');
const importoInput = document.getElementById('importo');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const formTitle = document.getElementById('formTitle');

// Search and list
const searchInput = document.getElementById('searchInput');
const interventiList = document.getElementById('interventiList');

// Stats elements
const totalInterventiEl = document.getElementById('totalInterventi');
const totalOreEl = document.getElementById('totalOre');
const totalFatturatoEl = document.getElementById('totalFatturato');

// CSV elements
const exportBtn = document.getElementById('exportCSV');
const importBtn = document.getElementById('importCSV');
const fileInput = document.getElementById('fileInput');

// Navigazione
goToRapportiniBtn.addEventListener('click', () => {
    homePage.classList.remove('active');
    rapportiniPage.classList.add('active');
});

goToHomeBtn.addEventListener('click', () => {
    rapportiniPage.classList.remove('active');
    homePage.classList.add('active');
    updateStats();
});

// Carica dati all'avvio
loadInterventi();

// Salva intervento
saveBtn.addEventListener('click', saveIntervento);

// Cancella modifica
cancelBtn.addEventListener('click', () => {
    resetForm();
});

// Ricerca
searchInput.addEventListener('input', (e) => {
    renderInterventi(e.target.value);
});

// CSV Export/Import
exportBtn.addEventListener('click', exportToCSV);
importBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', importFromCSV);

// FUNZIONI API

async function loadInterventi() {
    try {
        const response = await fetch(`${API_URL}/interventi`);
        const result = await response.json();
        
        if (result.success) {
            interventi = result.data;
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

async function saveIntervento() {
    // Validazione
    if (!clienteInput.value.trim() || !dataInput.value || !oreInput.value || !importoInput.value) {
        alert('Compila tutti i campi obbligatori (Cliente, Data, Ore, Importo)');
        return;
    }

    const intervento = {
        id: editingId || `intervento_${Date.now()}`,
        cliente: clienteInput.value.trim(),
        data: dataInput.value,
        luogo: luogoInput.value.trim(),
        ore: parseFloat(oreInput.value),
        descrizione: descrizioneInput.value.trim(),
        importo: parseFloat(importoInput.value),
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
            resetForm();
            await loadInterventi();
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
            await loadInterventi();
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
    clienteInput.value = intervento.cliente;
    dataInput.value = intervento.data;
    luogoInput.value = intervento.luogo || '';
    oreInput.value = intervento.ore;
    descrizioneInput.value = intervento.descrizione || '';
    importoInput.value = intervento.importo;
    
    formTitle.textContent = 'Modifica Intervento';
    saveBtn.textContent = 'Aggiorna Intervento';
    cancelBtn.style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    editingId = null;
    clienteInput.value = '';
    dataInput.value = '';
    luogoInput.value = '';
    oreInput.value = '';
    descrizioneInput.value = '';
    importoInput.value = '';
    
    formTitle.textContent = 'Nuovo Intervento';
    saveBtn.textContent = 'Salva Intervento';
    cancelBtn.style.display = 'none';
}

function renderInterventi(searchTerm = '') {
    const filteredInterventi = searchTerm 
        ? interventi.filter(i => 
            i.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.luogo && i.luogo.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : interventi;

    if (filteredInterventi.length === 0) {
        interventiList.innerHTML = `
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

    interventiList.innerHTML = sortedInterventi.map(intervento => `
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
    const totalInterventi = interventi.length;
    const totalOre = interventi.reduce((sum, i) => sum + (i.ore || 0), 0);
    const totalFatturato = interventi.reduce((sum, i) => sum + (i.importo || 0), 0);

    totalInterventiEl.textContent = totalInterventi;
    totalOreEl.textContent = `${totalOre.toFixed(1)}h`;
    totalFatturatoEl.textContent = `€${totalFatturato.toFixed(2)}`;
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
            await loadInterventi();
        } else {
            alert('Errore nell\'importazione: ' + result.message);
        }

        fileInput.value = '';
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nella lettura del file CSV');
    }
}

// Funzioni globali per onclick
window.editInterventoById = function(id) {
    const intervento = interventi.find(i => i.id === id);
    if (intervento) {
        editIntervento(intervento);
    }
};

window.deleteInterventoById = function(id) {
    deleteIntervento(id);
};