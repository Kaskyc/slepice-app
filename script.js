
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
    
    requiredFields.forEach(field => {
        const input = document.getElementById(field.id);
        const error = document.getElementById(`${field.id}-error`);
        
        if (!input.value.trim()) {
            input.classList.add('error');
            error.textContent = field.message;
            isValid = false;
        } else {
            input.classList.remove('error');
            error.textContent = '';
        }
    });
    
    // Validace datumů
    const datumZakoupeni = document.getElementById('datumZakoupeni').value;
    const datumUmrti = document.getElementById('datumUmrti').value;
    
    if (datumZakoupeni && datumUmrti) {
        if (new Date(datumUmrti) < new Date(datumZakoupeni)) {
            document.getElementById('datumUmrti').classList.add('error');
            document.getElementById('datumUmrti-error').textContent = 'Datum úmrtí nemůže být dříve než datum zakoupení';
            isValid = false;
        }
    }
    
    // Validace stáří při úmrtí
    if (datumUmrti && !document.getElementById('stariPriUmrti').value) {
        document.getElementById('stariPriUmrti').classList.add('error');
        document.getElementById('stariPriUmrti-error').textContent = 'Zadejte stáří při úmrtí';
        isValid = false;
    }
    
    return isValid;
}

// Uložení nebo aktualizace slepice
function saveSlepice() {
    if (!validateForm()) return;
    
    const slepiceId = slepiceIdInput.value;
    const druh = document.getElementById('druh').value;
    const datumZakoupeni = document.getElementById('datumZakoupeni').value;
    const stariPriZakoupeni = parseInt(document.getElementById('stariPriZakoupeni').value);
    const datumUmrti = document.getElementById('datumUmrti').value;
    const stariPriUmrti = document.getElementById('stariPriUmrti').value ? parseInt(document.getElementById('stariPriUmrti').value) : null;
    const barvaKrouzku = document.getElementById('barvaKrouzku').value;
    const cisloKrouzku = document.getElementById('cisloKrouzku').value;
    const porizovaci_cena = document.getElementById('porizovaci_cena').value ? parseInt(document.getElementById('porizovaci_cena').value) : null;
    
    if (slepiceId) {
        // Aktualizace existující slepice
        const index = slepice.findIndex(s => s.id === parseInt(slepiceId));
        if (index !== -1) {
            slepice[index] = {
                id: parseInt(slepiceId),
                druh,
                datumZakoupeni,
                stariPriZakoupeni,
                datumUmrti,
                stariPriUmrti,
                barvaKrouzku,
                cisloKrouzku,
                porizovaci_cena
            };
        }
    } else {
        // Přidání nové slepice
        const newId = slepice.length > 0 ? Math.max(...slepice.map(s => s.id)) + 1 : 1;
        slepice.push({
            id: newId,
            druh,
            datumZakoupeni,
            stariPriZakoupeni,
            datumUmrti,
            stariPriUmrti,
            barvaKrouzku,
            cisloKrouzku,
            porizovaci_cena
        });
    }
    
    // Aktualizace UI
    renderSlepiceTable(slepice);
    updateStats();
    
    // Uložení do lokálního úložiště
    saveData();
    
    // Zavření modálního okna
    closeModal(slepiceModal);
}

// Smazání slepice
function deleteSlepice(id) {
    slepice = slepice.filter(s => s.id !== id);
    
    // Aktualizace UI
    renderSlepiceTable(slepice);
    updateStats();
    
    // Uložení do lokálního úložiště
    saveData();
}// Otevření modálního okna pro editaci
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
