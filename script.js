// Globální proměnné pro Firebase a data
let auth, db, currentUser;
let slepice = []; // Pole pro ukládání dat slepic
let userId = null; // Zavedení proměnné pro userId

// Získání globálních proměnných pro appId (z prostředí Canvas)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Inicializace Firebase reference
function initFirebase() {
    try {
        console.log("Inicializace Firebase referencí...");
        // Kontrola, zda je Firebase již inicializován v globálním objektu window
        if (typeof firebase !== 'undefined' && firebase.app) {
            auth = firebase.auth();
            db = firebase.firestore();
            
            // Kontrola stavu přihlášení při inicializaci
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log("Uživatel přihlášen:", user.displayName || user.uid);
                    currentUser = user;
                    userId = user.uid; // Nastavení userId
                    document.getElementById('login-status').textContent = `Přihlášen jako: ${user.displayName || 'Anonymní uživatel'}`;
                    document.getElementById('user-id-display').textContent = `ID uživatele: ${userId}`;
                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('logout-section').style.display = 'flex';
                    
                    // Načtení dat uživatele
                    loadUserData();
                } else {
                    console.log("Žádný přihlášený uživatel");
                    currentUser = null;
                    // Pro anonymní uživatele generujeme unikátní ID pro lokální data
                    userId = crypto.randomUUID(); 
                    document.getElementById('login-section').style.display = 'flex';
                    document.getElementById('logout-section').style.display = 'none';
                    document.getElementById('login-status').textContent = '';
                    document.getElementById('user-id-display').textContent = `ID uživatele: ${userId} (anonymní)`; // Zobrazit anonymní ID
                    
                    // Načtení lokálních dat (pro neprihlaseneho uzivatele nebo prvni spusteni)
                    loadDataLocally();
                }
                // Aktualizovat UI po kontrole stavu přihlášení
                updateUIBasedOnLoginState(user); 
            });

            // Pokus o přihlášení pomocí custom tokenu, pokud je k dispozici
            // __initial_auth_token je globální proměnná poskytovaná Canvas prostředím
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                auth.signInWithCustomToken(__initial_auth_token)
                    .then(() => console.log("Přihlášení pomocí custom tokenu úspěšné."))
                    .catch(error => console.error("Chyba při přihlašování custom tokenem:", error));
            } else {
                // Pokud není custom token, přihlásit anonymně (pokud již není přihlášen)
                if (!auth.currentUser) {
                    auth.signInAnonymously()
                        .then(() => console.log("Anonymní přihlášení úspěšné."))
                        .catch(error => console.error("Chyba při anonymním přihlašování:", error));
                }
            }

        } else {
            console.error("Firebase není inicializován v okně. Ujistěte se, že jsou načteny Firebase SDK.");
            document.getElementById('firebase-status').style.display = 'block';
        }
    } catch (error) {
        console.error("Chyba při inicializaci Firebase referencí:", error);
        document.getElementById('firebase-status').style.display = 'block';
    }
}

// Funkce pro načítání dat z Firestore (používá onSnapshot pro real-time aktualizace)
function loadUserData() {
    if (!db || !currentUser) {
        console.log("Firestore nebo uživatel není k dispozici pro načtení dat.");
        return;
    }
    // Cesta ke kolekci pro konkrétního uživatele
    const userSlepiceRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/slepice`);

    // Použití onSnapshot pro real-time aktualizace
    userSlepiceRef.onSnapshot(snapshot => {
        slepice = [];
        snapshot.forEach(doc => {
            slepice.push({ id: doc.id, ...doc.data() });
        });
        const groups = groupSlepiceByDate(slepice);
        renderSlepiceGroups(groups);
        updateSummary();
        console.log("Data z Firestore načtena a aktualizována (real-time).");
    }, error => {
        console.error("Chyba při real-time načítání dat z Firestore:", error);
    });
}

// Funkce pro načítání dat z lokálního úložiště (pro anonymní uživatele nebo offline režim)
function loadDataLocally() {
    const storedSlepice = localStorage.getItem('slepice');
    if (storedSlepice) {
        slepice = JSON.parse(storedSlepice);
    } else {
        slepice = [];
    }
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
    updateSummary();
    console.log("Data načtena z lokálního úložiště.");
}

// Funkce pro ukládání dat do lokálního úložiště
function saveDataLocally() {
    localStorage.setItem('slepice', JSON.stringify(slepice));
    console.log("Data uložena do lokálního úložiště.");
}


// Funkce pro přidání/úpravu slepice
async function saveSlepice(slepiceData) {
    if (currentUser && db) {
        // Přihlášený uživatel, ukládáme do Firestore
        const slepiceRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/slepice`);
        if (slepiceData.id) {
            // Úprava existující slepice
            await slepiceRef.doc(slepiceData.id).update(slepiceData);
            console.log("Slepice aktualizována v Firestore:", slepiceData.id);
        } else {
            // Přidání nové slepice
            await slepiceRef.add(slepiceData);
            console.log("Nová slepice přidána do Firestore.");
        }
    } else {
        // Anonymní uživatel, ukládáme lokálně
        if (slepiceData.id) {
            // Úprava existující slepice
            const index = slepice.findIndex(s => s.id === slepiceData.id);
            if (index !== -1) {
                slepice[index] = { ...slepice[index], ...slepiceData };
            }
        } else {
            // Přidání nové slepice s lokálním ID
            slepiceData.id = Date.now().toString(); // Jednoduché lokální ID jako string
            slepice.push(slepiceData);
        }
        saveDataLocally();
    }
    closeModal(slepiceModal);
}

// Funkce pro odstranění slepice
async function deleteSlepice(id) {
    if (currentUser && db) {
        // Přihlášený uživatel, mažeme z Firestore
        await db.collection(`artifacts/${appId}/users/${currentUser.uid}/slepice`).doc(id).delete();
        console.log("Slepice odstraněna z Firestore:", id);
    } else {
        // Anonymní uživatel, mažeme lokálně
        slepice = slepice.filter(s => s.id !== id);
        saveDataLocally();
    }
    closeModal(deleteModal);
}

// Funkce pro smazání celé složky (všech slepic)
async function deleteAllSlepice() {
    if (currentUser && db) {
        // Přihlášený uživatel, mažeme z Firestore pomocí batch operace
        const batch = db.batch();
        const snapshot = await db.collection(`artifacts/${appId}/users/${currentUser.uid}/slepice`).get();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log("Všechny slepice odstraněny z Firestore.");
    } else {
        // Anonymní uživatel, mažeme lokálně
        slepice = [];
        saveDataLocally();
    }
    closeModal(deleteFolderModal);
}

// Funkce pro úpravu hodnot celé složky
async function editFolderValues(updates) {
    if (currentUser && db) {
        // Přihlášený uživatel, aktualizujeme v Firestore pomocí batch operace
        const batch = db.batch();
        const snapshot = await db.collection(`artifacts/${appId}/users/${currentUser.uid}/slepice`).get();

        snapshot.docs.forEach((doc) => {
            const currentData = doc.data();
            const updatedData = { ...currentData };
            for (const key in updates) {
                // Pouze aktualizovat, pokud je hodnota v 'updates' definovaná a není prázdný řetězec
                if (updates[key] !== null && updates[key] !== undefined && updates[key] !== '') {
                    updatedData[key] = updates[key];
                }
            }
            batch.update(doc.ref, updatedData);
        });
        await batch.commit();
        console.log("Hodnoty složky aktualizovány v Firestore.");
    } else {
        // Anonymní uživatel, aktualizujeme lokálně
        slepice = slepice.map(s => {
            const updatedSlepice = { ...s };
            for (const key in updates) {
                if (updates[key] !== null && updates[key] !== undefined && updates[key] !== '') {
                    updatedSlepice[key] = updates[key];
                }
            }
            return updatedSlepice;
        });
        saveDataLocally();
    }
    closeModal(editFolderModal);
}


// --- Pomocné funkce pro UI a data ---

// Funkce pro výpočet stáří slepice
function calculateAge(purchaseDate) {
    if (!purchaseDate) return 'Neznámé';
    const today = new Date();
    const bought = new Date(purchaseDate);
    let ageInMonths = (today.getFullYear() - bought.getFullYear()) * 12;
    ageInMonths -= bought.getMonth();
    ageInMonths += today.getMonth();
    
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;

    if (years > 0 && months > 0) {
        return `${years} let, ${months} měs.`;
    } else if (years > 0) {
        return `${years} let`;
    } else if (months > 0) {
        return `${months} měs.`;
    } else {
        return 'Méně než měsíc';
    }
}

// Funkce pro seskupení slepic podle data zakoupení
function groupSlepiceByDate(slepiceArray) {
    const groups = {};
    slepiceArray.forEach(s => {
        const date = s.datumZakoupeni;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(s);
    });
    return groups;
}

// Funkce pro vykreslení skupin slepic
function renderSlepiceGroups(groups) {
    const tableBody = document.getElementById('slepice-table-body');
    tableBody.innerHTML = ''; // Vyčistit tabulku

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(date => {
        const group = groups[date];
        const groupRow = document.createElement('tr');
        groupRow.classList.add('group-header');
        const totalGroupPrice = group.reduce((sum, s) => sum + parseFloat(s.cena || 0), 0);

        groupRow.innerHTML = `
            <td colspan="7">
                <div class="group-summary">
                    <span>Datum zakoupení: <strong>${new Date(date).toLocaleDateString('cs-CZ')}</strong> (${group.length} slepic)</span>
                    <span>Celková cena skupiny: <strong>${totalGroupPrice.toFixed(2)} Kč</strong></span>
                </div>
            </td>
        `;
        tableBody.appendChild(groupRow);

        group.forEach(s => {
            const row = document.createElement('tr');
            row.dataset.id = s.id;
            const age = calculateAge(s.datumZakoupeni);
            row.innerHTML = `
                <td>${s.druh || ''}</td>
                <td>${s.datumZakoupeni ? new Date(s.datumZakoupeni).toLocaleDateString('cs-CZ') : ''}</td>
                <td>${age}</td> <td>${parseFloat(s.cena || 0).toFixed(2)} Kč</td>
                <td class="ring-color-${s.krouzek ? s.krouzek.toLowerCase() : 'none'}">${s.krouzek || 'Žádný'}</td>
                <td>${s.poznamky || ''}</td>
                <td class="actions">
                    <button class="btn btn-edit" data-id="${s.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-delete" data-id="${s.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    });

    // Přidání posluchačů událostí pro tlačítka edit a delete po vykreslení
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', e => openAddModal(e.currentTarget.dataset.id));
    });
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', e => openDeleteModal(e.currentTarget.dataset.id));
    });
}

// Funkce pro aktualizaci souhrnných informací
function updateSummary() {
    const totalSlepice = slepice.length;
    const totalInvestment = slepice.reduce((sum, s) => sum + parseFloat(s.cena || 0), 0);
    const historicalRecords = slepice.length; // Pro jednoduchost stejné jako celkem slepic

    document.getElementById('total-slepice').textContent = totalSlepice;
    document.getElementById('total-investment').textContent = `${totalInvestment.toFixed(2)} Kč`;
    document.getElementById('historical-records').textContent = historicalRecords;
}

// --- Modální okna ---
const slepiceModal = document.getElementById('slepice-modal');
const deleteModal = document.getElementById('delete-modal');
const editFolderModal = document.getElementById('edit-folder-modal');
const deleteFolderModal = document.getElementById('delete-folder-modal');

const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');
const editFolderModalClose = document.getElementById('edit-folder-modal-close');
const editFolderCancel = document.getElementById('edit-folder-cancel');
const editFolderSave = document.getElementById('edit-folder-save');
const deleteFolderModalClose = document.getElementById('delete-folder-modal-close');
const deleteFolderCancel = document.getElementById('delete-folder-cancel');
const deleteFolderConfirm = document.getElementById('delete-folder-confirm');


function openModal(modalElement) {
    modalElement.style.display = 'flex'; // Použít flex pro centrování
}

function closeModal(modalElement) {
    modalElement.style.display = 'none';
}

// Otevření modálního okna pro přidání/úpravu
function openAddModal(id) {
    const form = document.getElementById('slepice-form');
    form.reset(); // Vyčistit formulář
    document.getElementById('slepice-id').value = ''; // Vyčistit ID

    if (id) {
        // Režim úpravy
        const slepiceToEdit = slepice.find(s => s.id === id);
        if (slepiceToEdit) {
            document.getElementById('slepice-id').value = slepiceToEdit.id;
            document.getElementById('druh').value = slepiceToEdit.druh || '';
            document.getElementById('datumZakoupeni').value = slepiceToEdit.datumZakoupeni || '';
            document.getElementById('cena').value = slepiceToEdit.cena || '';
            document.getElementById('poznamky').value = slepiceToEdit.poznamky || '';
            if (slepiceToEdit.krouzek) {
                const radio = document.querySelector(`input[name="krouzek"][value="${slepiceToEdit.krouzek}"]`);
                if (radio) radio.checked = true;
            } else {
                // Pokud kroužek není definován, nastavit "Žádný"
                const radioNone = document.querySelector('input[name="krouzek"][value="Žádný"]');
                if (radioNone) radioNone.checked = true;
            }
        }
    }
    openModal(slepiceModal);
}

// Otevření modálního okna pro potvrzení odstranění jedné slepice
function openDeleteModal(id) {
    deleteConfirm.dataset.id = id;
    openModal(deleteModal);
}

// Otevření modálního okna pro úpravu složky
function openEditFolderModal() {
    const form = document.getElementById('edit-folder-form');
    form.reset();
    // Nastaví "Ponechat stávající" jako výchozí pro kroužek v modalu úpravy složky
    const radioKeepExisting = document.querySelector('input[name="edit-folder-krouzek"][value=""]');
    if (radioKeepExisting) radioKeepExisting.checked = true;
    openModal(editFolderModal);
}

// Otevření modálního okna pro smazání složky
function openDeleteFolderModal() {
    openModal(deleteFolderModal);
}

// --- Obsluha formulářů a událostí ---

// Obsluha formuláře pro přidání/úpravu slepice
document.getElementById('slepice-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('slepice-id').value;
    const druh = document.getElementById('druh').value;
    const datumZakoupeni = document.getElementById('datumZakoupeni').value;
    const cena = parseFloat(document.getElementById('cena').value);
    // Získání hodnoty kroužku, pokud není vybráno, použije 'Žádný'
    const krouzek = document.querySelector('input[name="krouzek"]:checked')?.value || 'Žádný';
    const poznamky = document.getElementById('poznamky').value;

    const slepiceData = {
        druh,
        datumZakoupeni,
        cena,
        krouzek,
        poznamky
    };

    if (id) {
        slepiceData.id = id;
    }
    saveSlepice(slepiceData);
});

// Obsluha formuláře pro úpravu složky
document.getElementById('edit-folder-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const updates = {};
    const druh = document.getElementById('edit-folder-druh').value;
    const datumZakoupeni = document.getElementById('edit-folder-datumZakoupeni').value;
    const cena = document.getElementById('edit-folder-cena').value;
    // Získání hodnoty kroužku. Pokud je vybráno "Ponechat stávající" (value=""), pak se kroužek neaktualizuje.
    const krouzek = document.querySelector('input[name="edit-folder-krouzek"]:checked')?.value;
    const poznamky = document.getElementById('edit-folder-poznamky').value;

    if (druh) updates.druh = druh;
    if (datumZakoupeni) updates.datumZakoupeni = datumZakoupeni;
    // Pouze aktualizovat cenu, pokud je zadána a je platné číslo
    if (cena !== '' && !isNaN(parseFloat(cena))) updates.cena = parseFloat(cena);
    // Kroužek se aktualizuje, jen pokud není vybráno "Ponechat stávající" (prázdná hodnota)
    if (krouzek !== undefined && krouzek !== '') updates.krouzek = krouzek;
    if (poznamky) updates.poznamky = poznamky;

    editFolderValues(updates);
});

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initFirebase);

// Přihlášení Google účtem
document.getElementById('google-login-btn').addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        console.log("Přihlášení Google účtem úspěšné.");
    } catch (error) {
        console.error("Chyba při přihlašování Google účtem:", error);
    }
});

// Odhlášení
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        console.log("Uživatel odhlášen.");
        slepice = []; // Vyčistit lokální data po odhlášení
        saveDataLocally(); // Uložit prázdné pole
        const groups = groupSlepiceByDate(slepice);
        renderSlepiceGroups(groups);
        updateSummary();
    } catch (error) {
        console.error("Chyba při odhlašování:", error);
    }
});

// Vyhledávání
document.getElementById('search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filteredSlepice = slepice.filter(s =>
        (s.druh && s.druh.toLowerCase().includes(query)) ||
        (s.poznamky && s.poznamky.toLowerCase().includes(query)) ||
        (s.krouzek && s.krouzek.toLowerCase().includes(query)) ||
        (s.datumZakoupeni && new Date(s.datumZakoupeni).toLocaleDateString('cs-CZ').includes(query))
    );
    const filteredGroups = groupSlepiceByDate(filteredSlepice);
    renderSlepiceGroups(filteredGroups);
});

// Přidání slepice
document.getElementById('add-slepice-btn').addEventListener('click', () => openAddModal());

// Zavření modálních oken
modalClose.addEventListener('click', () => closeModal(slepiceModal));
modalCancel.addEventListener('click', () => closeModal(slepiceModal));
deleteModalClose.addEventListener('click', () => closeModal(deleteModal));
deleteCancel.addEventListener('click', () => closeModal(deleteModal));
editFolderModalClose.addEventListener('click', () => closeModal(editFolderModal));
editFolderCancel.addEventListener('click', () => closeModal(editFolderModal));
deleteFolderModalClose.addEventListener('click', () => closeModal(deleteFolderModal));
deleteFolderCancel.addEventListener('click', () => closeModal(deleteFolderModal));

// Potvrzení odstranění jedné slepice
deleteConfirm.addEventListener('click', () => {
    const id = deleteConfirm.dataset.id;
    deleteSlepice(id);
});

// Potvrzení odstranění celé složky
deleteFolderConfirm.addEventListener('click', deleteAllSlepice);

// Otevření modálního okna pro úpravu složky
document.getElementById('edit-folder-btn').addEventListener('click', openEditFolderModal);

// Otevření modálního okna pro smazání složky
document.getElementById('delete-folder-btn').addEventListener('click', openDeleteFolderModal);

// Zavření modálních oken při kliknutí mimo ně
window.addEventListener('click', e => {
    if (e.target === slepiceModal) {
        closeModal(slepiceModal);
    } else if (e.target === deleteModal) {
        closeModal(deleteModal);
    } else if (e.target === editFolderModal) {
        closeModal(editFolderModal);
    } else if (e.target === deleteFolderModal) {
        closeModal(deleteFolderModal);
    }
});

// Funkce pro aktualizaci UI na základě stavu přihlášení
function updateUIBasedOnLoginState(user) {
    if (user) {
        // Uživatel je přihlášen
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('logout-section').style.display = 'flex';
        document.getElementById('slepice-folder-container').style.display = 'flex';
        document.getElementById('main-app-content').style.display = 'none'; // Skrýt hlavní obsah na začátku
    } else {
        // Uživatel není přihlášen (anonymní nebo odhlášen)
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('logout-section').style.display = 'none';
        document.getElementById('slepice-folder-container').style.display = 'flex';
        document.getElementById('main-app-content').style.display = 'none'; // Skrýt hlavní obsah na začátku
    }
}

// Obsluha kliknutí na ikonu "Slepice"
document.getElementById('slepice-folder-icon').addEventListener('click', () => {
    document.getElementById('slepice-folder-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'none'; // Skrýt login po rozkliknutí
    document.getElementById('main-app-content').style.display = 'block'; // Zobrazit hlavní obsah
});
