// Počáteční data
let slepice = [
    { 
        id: 1, 
        druh: "Leghornka bílá", 
        datumZakoupeni: "2025-01-15", 
        stariPriZakoupeni: 12, 
        datumUmrti: "", 
        stariPriUmrti: null, 
        barvaKrouzku: "červená", 
        cisloKrouzku: "A123", 
        porizovaci_cena: 250 
    },
    { 
        id: 2, 
        druh: "Vlaška", 
        datumZakoupeni: "2024-11-03", 
        stariPriZakoupeni: 20, 
        datumUmrti: "", 
        stariPriUmrti: null, 
        barvaKrouzku: "modrá", 
        cisloKrouzku: "B456", 
        porizovaci_cena: 290 
    },
    { 
        id: 3, 
        druh: "Hempšírka", 
        datumZakoupeni: "2024-09-20", 
        stariPriZakoupeni: 16, 
        datumUmrti: "2025-03-15", 
        stariPriUmrti: 28, 
        barvaKrouzku: "zelená", 
        cisloKrouzku: "C789", 
        porizovaci_cena: 320 
    }
];

// Načtení dat z localStorage při startu
function loadData() {
    const savedData = localStorage.getItem('slepice-data');
    if (savedData) {
        try {
            slepice = JSON.parse(savedData);
        } catch (e) {
            console.error('Chyba při načítání dat:', e);
        }
    }
}

// Uložení dat do localStorage
function saveData() {
    localStorage.setItem('slepice-data', JSON.stringify(slepice));
}

// HTML elementy
const slepiceTableBody = document.getElementById('slepice-table-body');
const searchInput = document.getElementById('search-input');
const addSlepiceBtn = document.getElementById('add-slepice-btn');

const slepiceModal = document.getElementById('slepice-modal');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');

const slepiceForm = document.getElementById('slepice-form');
const slepiceIdInput = document.getElementById('slepice-id');

const deleteModal = document.getElementById('delete-modal');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');
const deleteSlepiceName = document.getElementById('delete-slepice-name');

const statTotal = document.getElementById('stat-total');
const statInvestment = document.getElementById('stat-investment');
const statHistorical = document.getElementById('stat-historical');

// Formátování data
function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
}

// Zobrazení tabulky slepic
function renderSlepiceTable(data) {
    slepiceTableBody.innerHTML = '';
    
    if (data.length === 0) {
        slepiceTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-feather"></i>
                        <p>Zatím nemáte žádné záznamy</p>
                        <button class="btn btn-primary" id="empty-add-btn">
                            <i class="fas fa-plus"></i> Přidat první slepici
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        document.getElementById('empty-add-btn')?.addEventListener('click', openAddModal);
        return;
    }
    
    data.forEach(slepice => {
        const row = document.createElement('tr');
        
        // Barva kroužku
        let colorStyle = '';
        if (slepice.barvaKrouzku) {
            const color = getColorCode(slepice.barvaKrouzku);
            colorStyle = `<span class="color-badge" style="background-color: ${color}"></span>`;
        }
        
        // Status
        const statusHtml = slepice.datumUmrti 
            ? `<span class="status status-deceased">Zemřela</span>` 
            : `<span class="status status-active">Žije</span>`;
        
        row.innerHTML = `
            <td>${slepice.druh}</td>
            <td>
                ${formatDate(slepice.datumZakoupeni)}
                <div style="font-size: 0.8rem; color: #666;">${slepice.stariPriZakoupeni} týdnů</div>
            </td>
            <td>
                ${slepice.datumUmrti 
                    ? `${formatDate(slepice.datumUmrti)}<div style="font-size: 0.8rem; color: #666;">${slepice.stariPriUmrti} týdnů</div>` 
                    : statusHtml
                }
            </td>
            <td>${colorStyle}${slepice.cisloKrouzku || "-"}</td>
            <td>${slepice.porizovaci_cena ? `${slepice.porizovaci_cena} Kč` : "-"}</td>
            <td class="actions">
                <button class="icon-btn edit-btn" data-id="${slepice.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete-btn" data-id="${slepice.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        slepiceTableBody.appendChild(row);
    });
    
    // Nastavení event listenerů pro tlačítka
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
    });
}

// Získání kódu barvy
function getColorCode(barva) {
    switch (barva.toLowerCase()) {
        case 'červená': return '#E53935';
        case 'zelená': return '#43A047';
        case 'žlutá': return '#FDD835';
        case 'modrá': return '#1E88E5';
        default: return '#9E9E9E';
    }
}

// Aktualizace statistik
function updateStats() {
    const activeSlepice = slepice.filter(s => !s.datumUmrti);
    const historicalSlepice = slepice.filter(s => s.datumUmrti);
    const totalInvestment = slepice.reduce((sum, s) => sum + (parseInt(s.porizovaci_cena) || 0), 0);
    
    statTotal.textContent = activeSlepice.length;
    statInvestment.textContent = `${totalInvestment} Kč`;
    statHistorical.textContent = historicalSlepice.length;
}

// Vyhledávání
function searchSlepice(query) {
    if (!query) {
        return slepice;
    }
    
    query = query.toLowerCase();
    return slepice.filter(s => 
        s.druh.toLowerCase().includes(query) ||
        (s.cisloKrouzku && s.cisloKrouzku.toLowerCase().includes(query)) ||
        (s.barvaKrouzku && s.barvaKrouzku.toLowerCase().includes(query))
    );
}

// Otevření modálního okna pro přidání
function openAddModal() {
    modalTitle.textContent = 'Přidat novou slepici';
    slepiceForm.reset();
    slepiceIdInput.value = '';
    
    // Nastavit dnešní datum jako výchozí pro datum zakoupení
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('datumZakoupeni').value = today;
    
    slepiceModal.classList.add('active');
}

// Otevření modálního okna pro editaci
function openEditModal(id) {
    const slepiceToEdit = slepice.find(s => s.id === id);
    if (!slepiceToEdit) return;
    
    modalTitle.textContent = 'Upravit záznam';
    
    // Nastavení hodnot formuláře
    slepiceIdInput.value = slepiceToEdit.id;
    document.getElementById('druh').value = slepiceToEdit.druh;
    document.getElementById('datumZakoupeni').value = slepiceToEdit.datumZakoupeni;
    document.getElementById('stariPriZakoupeni').value = slepiceToEdit.stariPriZakoupeni;
    document.getElementById('datumUmrti').value = slepiceToEdit.datumUmrti || '';
    document.getElementById('stariPriUmrti').value = slepiceToEdit.stariPriUmrti || '';
    document.getElementById('barvaKrouzku').value = slepiceToEdit.barvaKrouzku || '';
    document.getElementById('cisloKrouzku').value = slepiceToEdit.cisloKrouzku || '';
    document.getElementById('porizovaci_cena').value = slepiceToEdit.porizovaci_cena || '';
    
    slepiceModal.classList.add('active');
}

// Otevření modálního okna pro potvrzení smazání
function openDeleteModal(id) {
    const slepiceToDelete = slepice.find(s => s.id === id);
    if (!slepiceToDelete) return;
    
    deleteSlepiceName.textContent = `"${slepiceToDelete.druh}" (${slepiceToDelete.cisloKrouzku || 'bez kroužku'})`;
    deleteConfirm.dataset.id = id;
    
    deleteModal.classList.add('active');
}

// Zavření modálního okna
function closeModal(modal) {
    modal.classList.remove('active');
    
    // Odstranění chybových hlášek
    document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
    });
    
    document.querySelectorAll('.form-control').forEach(el => {
        el.classList.remove('error');
    });
}

// Validace formuláře
function validateForm() {
    let isValid = true;
    
    // Povinná pole
    const requiredFields = [
        { id: 'druh', message: 'Zadejte druh slepice' },
        { id: 'datumZakoupeni', message: 'Vyberte datum zakoupení' },
        { id: 'stariPriZakoupeni', message: 'Zadejte stáří při zakoupení' }
    ];
    
    // Kontrola povinných polí
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        const errorElement = document.getElementById(`${field.id}-error`);
        
        if (!element.value.trim()) {
            element.classList.add('error');
            errorElement.textContent = field.message;
            isValid = false;
        } else {
            element.classList.remove('error');
            errorElement.textContent = '';
        }
    });
    
    // Kontrola data úmrtí a stáří při úmrtí
    const datumUmrti = document.getElementById('datumUmrti').value;
    const stariPriUmrti = document.getElementById('stariPriUmrti').value;
    
    if (datumUmrti && !stariPriUmrti) {
        document.getElementById('stariPriUmrti').classList.add('error');
        document.getElementById('stariPriUmrti-error').textContent = 'Zadejte stáří při úmrtí';
        isValid = false;
    } else if (!datumUmrti && stariPriUmrti) {
        document.getElementById('datumUmrti').classList.add('error');
        document.getElementById('datumUmrti-error').textContent = 'Vyberte datum úmrtí';
        isValid = false;
    }
    
    return isValid;
}

// Uložení formuláře
function saveForm() {
    if (!validateForm()) return;
    
    const slepiceId = slepiceIdInput.value;
    const isEditing = slepiceId !== '';
    
    const novaSlepice = {
        id: isEditing ? parseInt(slepiceId) : (slepice.length > 0 ? Math.max(...slepice.map(s => s.id)) + 1 : 1),
        druh: document.getElementById('druh').value,
        datumZakoupeni: document.getElementById('datumZakoupeni').value,
        stariPriZakoupeni: parseInt(document.getElementById('stariPriZakoupeni').value),
        datumUmrti: document.getElementById('datumUmrti').value || '',
        stariPriUmrti: document.getElementById('stariPriUmrti').value ? parseInt(document.getElementById('stariPriUmrti').value) : null,
        barvaKrouzku: document.getElementById('barvaKrouzku').value,
        cisloKrouzku: document.getElementById('cisloKrouzku').value,
        porizovaci_cena: document.getElementById('porizovaci_cena').value ? parseInt(document.getElementById('porizovaci_cena').value) : null
    };
    
    if (isEditing) {
        // Aktualizace existující slepice
        const index = slepice.findIndex(s => s.id === parseInt(slepiceId));
        if (index !== -1) {
            slepice[index] = novaSlepice;
        }
    } else {
        // Přidání nové slepice
        slepice.push(novaSlepice);
    }
    
    // Uložení dat
    saveData();
    
    // Aktualizace tabulky a statistik
    renderSlepiceTable(slepice);
    updateStats();
    
    // Zavření modálního okna
    closeModal(slepiceModal);
}

// Odstranění slepice
function deleteSlepice(id) {
    const index = slepice.findIndex(s => s.id === id);
    if (index !== -1) {
        slepice.splice(index, 1);
        
        // Uložení dat
        saveData();
        
        // Aktualizace tabulky a statistik
        renderSlepiceTable(slepice);
        updateStats();
    }
    
    // Zavření modálního okna
    closeModal(deleteModal);
}

// Event listenery
document.addEventListener('DOMContentLoaded', () => {
    // Načtení uložených dat
    loadData();
    
    // Zobrazení dat
    renderSlepiceTable(slepice);
    updateStats();
    
    // Vyhledávání
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        const filteredData = searchSlepice(query);
        renderSlepiceTable(filteredData);
    });
    
    // Přidání slepice
    addSlepiceBtn.addEventListener('click', openAddModal);
    
    // Zavření modálních oken
    modalClose.addEventListener('click', () => closeModal(slepiceModal));
    modalCancel.addEventListener('click', () => closeModal(slepiceModal));
    deleteModalClose.addEventListener('click', () => closeModal(deleteModal));
    deleteCancel.addEventListener('click', () => closeModal(deleteModal));
    
    // Uložení formuláře
    modalSave.addEventListener('click', saveForm);
    
    // Potvrzení odstranění
    deleteConfirm.addEventListener('click', () => {
        const id = parseInt(deleteConfirm.dataset.id);
        deleteSlepice(id);
    });
    
    // Zavření modálních oken při kliknutí mimo ně
    window.addEventListener('click', e => {
        if (e.target === slepiceModal) {
            closeModal(slepiceModal);
        } else if (e.target === deleteModal) {
            closeModal(deleteModal);
        }
    });
});
