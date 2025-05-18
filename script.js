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
        cisloKrouzku: "1", 
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
        cisloKrouzku: "2", 
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
        cisloKrouzku: "3", 
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
const druhInput = document.getElementById('druh');
const datumZakoupeniInput = document.getElementById('datumZakoupeni');
const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
const datumUmrtiInput = document.getElementById('datumUmrti');
const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
const barvaKrouzkuInput = document.getElementById('barvaKrouzku');
const cisloKrouzkuInput = document.getElementById('cisloKrouzku');
const porizovaci_cenaInput = document.getElementById('porizovaci_cena');
const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
const pocetSlepicInput = document.getElementById('pocet-slepic');
const hromadnePridaniContainer = document.getElementById('hromadne-pridani-container');
const druhyDatalist = document.getElementById('druhy-datalist');

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

// Získání unikátních druhů slepic z existujících záznamů
function updateDruhyDatalist() {
    if (!druhyDatalist) return;
    
    druhyDatalist.innerHTML = '';
    const uniqueDruhy = [...new Set(slepice.map(s => s.druh))];
    
    uniqueDruhy.forEach(druh => {
        const option = document.createElement('option');
        option.value = druh;
        druhyDatalist.appendChild(option);
    });
}

// Naplnění selectu pro čísla kroužků
function populateCislaKrouzku() {
    if (!cisloKrouzkuInput) return;
    
    cisloKrouzkuInput.innerHTML = '<option value="">Vyberte číslo</option>';
    
    for (let i = 1; i <= 20; i++) {
        const option = document.createElement('option');
        option.value = i.toString();
        option.textContent = i.toString();
        cisloKrouzkuInput.appendChild(option);
    }
}

// Automatický výpočet stáří při úmrtí
function calculateStariPriUmrti() {
    if (!datumZakoupeniInput.value || !datumUmrtiInput.value || !stariPriZakoupeniInput.value) {
        return;
    }
    
    const datumZakoupeni = new Date(datumZakoupeniInput.value);
    const datumUmrti = new Date(datumUmrtiInput.value);
    const stariPriZakoupeni = parseInt(stariPriZakoupeniInput.value);
    
    // Kontrola platnosti dat
    if (datumUmrti <= datumZakoupeni) {
        document.getElementById('datumUmrti-error').textContent = 'Datum úmrtí musí být pozdější než datum zakoupení';
        return;
    }
    
    // Výpočet rozdílu v týdnech
    const rozdilDny = Math.floor((datumUmrti - datumZakoupeni) / (1000 * 60 * 60 * 24));
    const rozdilTydny = Math.floor(rozdilDny / 7);
    
    // Stáří při úmrtí = stáří při zakoupení + počet týdnů mezi datumem zakoupení a úmrtím
    const stariPriUmrti = stariPriZakoupeni + rozdilTydny;
    
    stariPriUmrtiInput.value = stariPriUmrti;
}

// Přepnutí zobrazení hromadného přidání
function toggleHromadnePridani() {
    if (!hromadnePridaniContainer || !hromadnePridaniCheck) return;
    
    hromadnePridaniContainer.style.display = hromadnePridaniCheck.checked ? 'block' : 'none';
}

// Otevření modálního okna pro přidání
function openAddModal() {
    modalTitle.textContent = 'Přidat novou slepici';
    slepiceForm.reset();
    slepiceIdInput.value = '';
    
    // Nastavit dnešní datum jako výchozí pro datum zakoupení
    const today = new Date().toISOString().split('T')[0];
    datumZakoupeniInput.value = today;
    
    // Aktualizace našeptávače druhů
    updateDruhyDatalist();
    
    // Naplnění čísly kroužků
    populateCislaKrouzku();
    
    // Resetování a zobrazení hromadného přidání
    if (hromadnePridaniCheck) {
        hromadnePridaniCheck.checked = false;
        toggleHromadnePridani();
        
        // Zobrazení sekce pro hromadné přidání
        document.getElementById('hromadne-pridani-section').style.display = 'block';
    }
    
    slepiceModal.classList.add('active');
}

// Otevření modálního okna pro editaci
function openEditModal(id) {
    const slepiceToEdit = slepice.find(s => s.id === id);
    if (!slepiceToEdit) return;
    
    modalTitle.textContent = 'Upravit záznam';
    
    // Nastavení hodnot formuláře
    slepiceIdInput.value = slepiceToEdit.id;
    druhInput.value = slepiceToEdit.druh;
    datumZakoupeniInput.value = slepiceToEdit.datumZakoupeni;
    stariPriZakoupeniInput.value = slepiceToEdit.stariPriZakoupeni;
    datumUmrtiInput.value = slepiceToEdit.datumUmrti || '';
    stariPriUmrtiInput.value = slepiceToEdit.stariPriUmrti || '';
    barvaKrouzkuInput.value = slepiceToEdit.barvaKrouzku || '';
    
    // Naplnění čísly kroužků
    populateCislaKrouzku();
    
    // Nastavení vybraného čísla kroužku
    if (slepiceToEdit.cisloKrouzku) {
        // Pokud je číslo kroužku v rozsahu 1-20, vybereme ho ze seznamu
        if (/^\d+$/.test(slepiceToEdit.cisloKrouzku) && parseInt(slepiceToEdit.cisloKrouzku) >= 1 && parseInt(slepiceToEdit.cisloKrouzku) <= 20) {
            cisloKrouzkuInput.value = slepiceToEdit.cisloKrouzku;
        } else {
            // Pokud je to jiný formát, přidáme speciální možnost
            const option = document.createElement('option');
            option.value = slepiceToEdit.cisloKrouzku;
            option.textContent = slepiceToEdit.cisloKrouzku;
            cisloKrouzkuInput.appendChild(option);
            cisloKrouzkuInput.value = slepiceToEdit.cisloKrouzku;
        }
    } else {
        cisloKrouzkuInput.value = '';
    }
    
    porizovaci_cenaInput.value = slepiceToEdit.porizovaci_cena || '';
    
    // Skrytí hromadného přidání při editaci
    if (document.getElementById('hromadne-pridani-section')) {
        document.getElementById('hromadne-pridani-section').style.display = 'none';
    }
    
    // Aktualizace našeptávače druhů
    updateDruhyDatalist();
    
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
    const datumUmrti = datumUmrtiInput.value;
    
    if (datumUmrti) {
        // Automatický výpočet stáří při úmrtí, pokud není zadáno
        if (!stariPriUmrtiInput.value) {
            calculateStariPriUmrti();
        }
        
        // Ověření, že datum úmrtí je pozdější než datum zakoupení
        const datumZakoupeni = new Date(datumZakoupeniInput.value);
        const datumUmrtiDate = new Date(datumUmrti);
        
        if (datumUmrtiDate <= datumZakoupeni) {
            datumUmrtiInput.classList.add('error');
            document.getElementById('datumUmrti-error').textContent = 'Datum úmrtí musí být pozdější než datum zakoupení';
            isValid = false;
        }
    }
    
    // Kontrola hromadného přidání
    if (hromadnePridaniCheck && hromadnePridaniCheck.checked) {
        if (!pocetSlepicInput.value || parseInt(pocetSlepicInput.value) < 2) {
            pocetSlepicInput.classList.add('error');
            document.getElementById('pocet-slepic-error').textContent = 'Zadejte počet slepic (minimálně 2)';
            isValid = false;
        } else {
            pocetSlepicInput.classList.remove('error');
            document.getElementById('pocet-slepic-error').textContent = '';
        }
        
        if (!cisloKrouzkuInput.value) {
            cisloKrouzkuInput.classList.add('error');
            document.getElementById('cisloKrouzku-error').textContent = 'Pro hromadné přidání musíte zadat číslo prvního kroužku';
            isValid = false;
        }
    }
    
    return isValid;
}

// Uložení formuláře
function saveForm() {
    if (!validateForm()) return;
    
    const slepiceId = slepiceIdInput.value;
    const isEditing = slepiceId !== '';
    
    const baseSlepice = {
        druh: druhInput.value,
        datumZakoupeni: datumZakoupeniInput.value,
        stariPriZakoupeni: parseInt(stariPriZakoupeniInput.value),
        datumUmrti: datumUmrtiInput.value || '',
        stariPriUmrti: stariPriUmrtiInput.value ? parseInt(stariPriUmrtiInput.value) : null,
        barvaKrouzku: barvaKrouzkuInput.value,
        porizovaci_cena: porizovaci_cenaInput.value ? parseInt(porizovaci_cenaInput.value) : null
    };
    
    if (isEditing) {
        // Aktualizace existující slepice
        const updatedSlepice = {
            id: parseInt(slepiceId),
            ...baseSlepice,
            cisloKrouzku: cisloKrouzkuInput.value
        };
        
        const index = slepice.findIndex(s => s.id === parseInt(slepiceId));
        if (index !== -1) {
            slepice[index] = updatedSlepice;
        }
    } else {
        // Přidání nové slepice nebo hromadné přidání
        if (hromadnePridaniCheck && hromadnePridaniCheck.checked && pocetSlepicInput.value) {
            const pocet = parseInt(pocetSlepicInput.value);
            const startId = slepice.length > 0 ? Math.max(...slepice.map(s => s.id)) + 1 : 1;
            
            // Získání základního čísla kroužku
            let baseKrouzek = parseInt(cisloKrouzkuInput.value);
            if (isNaN(baseKrouzek)) {
                baseKrouzek = 1; // Výchozí hodnota, pokud není zadáno číselné číslo kroužku
            }
            
            // Vytvoření zadaného počtu slepic
            for (let i = 0; i < pocet; i++) {
                const novaSlepice = {
                    id: startId + i,
                    ...baseSlepice,
                    cisloKrouzku: (baseKrouzek + i).toString()
                };
                
                slepice.push(novaSlepice);
            }
        } else {
            // Přidání jedné slepice
            const novaSlepice = {
                id: slepice.length > 0 ? Math.max(...slepice.map(s => s.id)) + 1 : 1,
                ...baseSlepice,
                cisloKrouzku: cisloKrouzkuInput.value
            };
            
            slepice.push(novaSlepice);
        }
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
   console.log("DOM content loaded, initializing app");
   
   // Načtení uložených dat
   loadData();
   
   // Inicializace formulářových prvků
   if (datumUmrtiInput) {
       datumUmrtiInput.addEventListener('change', calculateStariPriUmrti);
   }
   
   if (datumZakoupeniInput) {
       datumZakoupeniInput.addEventListener('change', () => {
           if (datumUmrtiInput && datumUmrtiInput.value) {
               calculateStariPriUmrti();
           }
       });
   }
   
   if (stariPriZakoupeniInput) {
       stariPriZakoupeniInput.addEventListener('change', () => {
           if (datumUmrtiInput && datumUmrtiInput.value) {
               calculateStariPriUmrti();
           }
       });
   }
   
   // Inicializace hromadného přidání
   if (hromadnePridaniCheck) {
       hromadnePridaniCheck.addEventListener('change', toggleHromadnePridani);
   }
   
   // Naplnění dropdown čísel kroužků
   populateCislaKrouzku();
   
   // Aktualizace seznamu druhů
   updateDruhyDatalist();
   
   // Zobrazení dat
   renderSlepiceTable(slepice);
   updateStats();
   
   // Vyhledávání
   if (searchInput) {
       searchInput.addEventListener('input', () => {
           const query = searchInput.value.trim();
           const filteredData = searchSlepice(query);
           renderSlepiceTable(filteredData);
       });
   }
   
   // Přidání slepice
   if (addSlepiceBtn) {
       addSlepiceBtn.addEventListener('click', openAddModal);
   }
   
   // Zavření modálních oken
   if (modalClose) {
       modalClose.addEventListener('click', () => closeModal(slepiceModal));
   }
   
   if (modalCancel) {
       modalCancel.addEventListener('click', () => closeModal(slepiceModal));
   }
   
   if (deleteModalClose) {
       deleteModalClose.addEventListener('click', () => closeModal(deleteModal));
   }
   
   if (deleteCancel) {
       deleteCancel.addEventListener('click', () => closeModal(deleteModal));
   }
   
   // Uložení formuláře
   if (modalSave) {
       modalSave.addEventListener('click', saveForm);
   }
   
   // Potvrzení odstranění
   if (deleteConfirm) {
       deleteConfirm.addEventListener('click', () => {
           const id = parseInt(deleteConfirm.dataset.id);
           deleteSlepice(id);
       });
   }
   
   // Zavření modálních oken při kliknutí mimo ně
   window.addEventListener('click', e => {
       if (e.target === slepiceModal) {
           closeModal(slepiceModal);
       } else if (e.target === deleteModal) {
           closeModal(deleteModal);
       }
   });
   
   console.log("App initialization completed");
});
                
