// Globální proměnné pro Firebase
let auth, db, currentUser;
let chickenCollectionRef; // Reference na kolekci slepic pro aktuálního uživatele

// DOM elementy
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplayName = document.getElementById('user-display-name');
const firebaseStatusDiv = document.getElementById('firebase-status');
const statusMessageDiv = document.getElementById('status-message');

const addChickenBtn = document.getElementById('add-chicken-btn');
const chickenList = document.getElementById('chicken-list');
const chickenModal = document.getElementById('chicken-modal');
const closeButtons = document.querySelectorAll('.close-button');
const chickenForm = document.getElementById('chicken-form');
const modalTitle = document.getElementById('modal-title');
const chickenIdInput = document.getElementById('chicken-id');

const druhInput = document.getElementById('druh');
const datumZakoupeniInput = document.getElementById('datumZakoupeni');
const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
const datumUmrtiInput = document.getElementById('datumUmrti');
const stariPriUmrtiGroup = document.getElementById('stariPriUmrti-group');
const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
const barvaKrouzkuInput = document.getElementById('barvaKrouzku');
const cisloKrouzkuInput = document.getElementById('cisloKrouzku');
const stranaKrouzkuInput = document.getElementById('stranaKrouzku');
const porizovaci_cenaInput = document.getElementById('porizovaci_cena');

const totalChickensElement = document.getElementById('total-chickens');
const averageAgeElement = document.getElementById('average-age');
const totalCostElement = document.getElementById('total-cost');
const searchInput = document.getElementById('search-input');

const deleteConfirmModal = document.getElementById('delete-confirm-modal');
let chickenToDeleteId = null; // ID slepice k smazání
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');

// Funkce pro zobrazení zpráv uživateli
function showStatusMessage(message, type = 'info') {
    statusMessageDiv.innerHTML = `<i class="fas fa-info-circle"></i> <p>${message}</p>`;
    statusMessageDiv.classList.remove('alert-danger', 'alert-success', 'alert-info');
    statusMessageDiv.classList.add(`alert-${type}`);
    statusMessageDiv.style.display = 'flex';
    setTimeout(() => {
        statusMessageDiv.style.display = 'none';
    }, 5000);
}

// Funkce pro resetování chybových zpráv formuláře
function resetErrorMessages() {
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('input').forEach(el => el.classList.remove('input-error'));
}

// Funkce pro zobrazení chybové zprávy u konkrétního inputu
function displayInputError(inputId, message) {
    const errorElement = document.getElementById(`${inputId}-error`);
    const inputElement = document.getElementById(inputId);
    if (errorElement) {
        errorElement.textContent = message;
    }
    if (inputElement) {
        inputElement.classList.add('input-error');
    }
}

// Inicializace Firebase po načtení DOM
document.addEventListener('DOMContentLoaded', () => {
    auth = firebase.auth();
    db = firebase.firestore();

    // Sledujeme stav autentizace uživatele
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userDisplayName.textContent = user.displayName || user.email;
            loginContainer.style.display = 'none';
            appContainer.style.display = 'block';
            logoutBtn.style.display = 'block';
            chickenCollectionRef = db.collection('users').doc(currentUser.uid).collection('chickens');
            listenForChickenChanges(); // Začneme poslouchat změny v datech
            showStatusMessage('Přihlášen jako ' + user.email, 'success');
        } else {
            currentUser = null;
            userDisplayName.textContent = 'Host';
            loginContainer.style.display = 'block';
            appContainer.style.display = 'none';
            logoutBtn.style.display = 'none';
            chickenCollectionRef = null;
            chickenList.innerHTML = '<tr><td colspan="6" class="text-muted text-center">Pro zobrazení dat se prosím přihlaste.</td></tr>';
            totalChickensElement.textContent = '0';
            averageAgeElement.textContent = '0 týdnů';
            totalCostElement.textContent = '0 Kč';
            showStatusMessage('Odhlášeno. Prosím přihlaste se.', 'info');
        }
    });

    // Event listenery pro přihlášení a registraci
    loginBtn.addEventListener('click', handleLogin);
    registerBtn.addEventListener('click', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);

    // Event listener pro přidání nové slepice
    addChickenBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Přidat novou slepici';
        chickenForm.reset();
        chickenIdInput.value = ''; // Zajistí, že se jedná o nové přidání
        stariPriUmrtiGroup.style.display = 'none'; // Skryjeme pole pro stáří při úmrtí
        stariPriUmrtiInput.value = '';
        resetErrorMessages();
        chickenModal.classList.add('show');
    });

    // Event listenery pro uzavření modalu
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            chickenModal.classList.remove('show');
            deleteConfirmModal.classList.remove('show');
        });
    });

    // Zavření modalu kliknutím mimo obsah
    window.addEventListener('click', (event) => {
        if (event.target == chickenModal) {
            chickenModal.classList.remove('show');
        }
        if (event.target == deleteConfirmModal) {
            deleteConfirmModal.classList.remove('show');
        }
    });

    // Event listener pro formulář
    chickenForm.addEventListener('submit', handleChickenFormSubmit);

    // Event listener pro změnu data úmrtí - přepočet stáří při úmrtí
    datumUmrtiInput.addEventListener('change', calculateStariPriUmrti);
    datumZakoupeniInput.addEventListener('change', calculateStariPriUmrti);
    stariPriZakoupeniInput.addEventListener('input', calculateStariPriUmrti);

    // Event listener pro vyhledávání
    searchInput.addEventListener('input', filterChickens);

    // Event listenery pro smazání slepice
    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('show');
        chickenToDeleteId = null;
    });

    confirmDeleteBtn.addEventListener('click', handleDeleteChicken);
});


// === Firebase Autentizace a databáze ===

async function handleLogin(event) {
    event.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    if (!email || !password) {
        showStatusMessage('Prosím vyplňte email a heslo.', 'danger');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // showStatusMessage bude volán v onAuthStateChanged
    } catch (error) {
        console.error("Chyba při přihlášení:", error);
        let errorMessage = 'Chyba při přihlášení.';
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Neplatný email nebo heslo.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Neplatný formát emailu.';
                break;
            default:
                errorMessage = 'Chyba: ' + error.message;
        }
        showStatusMessage(errorMessage, 'danger');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    if (!email || !password) {
        showStatusMessage('Prosím vyplňte email a heslo.', 'danger');
        return;
    }

    if (password.length < 6) {
        showStatusMessage('Heslo musí mít alespoň 6 znaků.', 'danger');
        return;
    }

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        // showStatusMessage bude volán v onAuthStateChanged
    } catch (error) {
        console.error("Chyba při registraci:", error);
        let errorMessage = 'Chyba při registraci.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Tento email je již registrován.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Neplatný formát emailu.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Heslo je příliš slabé.';
                break;
            default:
                errorMessage = 'Chyba: ' + error.message;
        }
        showStatusMessage(errorMessage, 'danger');
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        // showStatusMessage bude volán v onAuthStateChanged
    } catch (error) {
        console.error("Chyba při odhlášení:", error);
        showStatusMessage('Chyba při odhlášení: ' + error.message, 'danger');
    }
}

// Poslouchání změn v kolekci slepic uživatele
let unsubscribeFromChickens = null; // Proměnná pro uložení funkce pro odhlášení z posluchače

function listenForChickenChanges() {
    if (unsubscribeFromChickens) {
        unsubscribeFromChickens(); // Odhlásíme se od předchozího posluchače
    }

    if (chickenCollectionRef) {
        unsubscribeFromChickens = chickenCollectionRef.orderBy('druh').onSnapshot(snapshot => {
            const slepice = [];
            snapshot.forEach(doc => {
                slepice.push({ id: doc.id, ...doc.data() });
            });
            renderSlepice(slepice);
            updateStatistics(slepice);
        }, error => {
            console.error("Chyba při načítání slepic z Firestore:", error);
            showStatusMessage('Nepodařilo se načíst data o slepicích: ' + error.message, 'danger');
        });
    }
}

// Funkce pro uložení/aktualizaci slepice ve Firestore
async function saveChickenToFirestore(chickenData) {
    if (!currentUser || !chickenCollectionRef) {
        showStatusMessage('Nejste přihlášeni. Data nelze uložit.', 'danger');
        return;
    }

    try {
        if (chickenData.id) {
            // Aktualizace existující slepice
            const chickenId = chickenData.id;
            delete chickenData.id; // ID nesmí být součástí dokumentu
            await chickenCollectionRef.doc(chickenId).update(chickenData);
            showStatusMessage('Slepice úspěšně aktualizována.', 'success');
        } else {
            // Přidání nové slepice
            await chickenCollectionRef.add(chickenData);
            showStatusMessage('Nová slepice úspěšně přidána.', 'success');
        }
    } catch (error) {
        console.error("Chyba při ukládání slepice do Firestore:", error);
        showStatusMessage('Chyba při ukládání slepice: ' + error.message, 'danger');
    }
}

// Funkce pro smazání slepice z Firestore
async function deleteChickenFromFirestore(id) {
    if (!currentUser || !chickenCollectionRef) {
        showStatusMessage('Nejste přihlášeni. Data nelze smazat.', 'danger');
        return;
    }

    try {
        await chickenCollectionRef.doc(id).delete();
        showStatusMessage('Slepice úspěšně smazána.', 'success');
    } catch (error) {
        console.error("Chyba při mazání slepice z Firestore:", error);
        showStatusMessage('Chyba při mazání slepice: ' + error.message, 'danger');
    }
}

// === Logika aplikace pro správu slepic ===

function renderSlepice(slepice) {
    chickenList.innerHTML = ''; // Vyčistíme stávající obsah

    if (slepice.length === 0) {
        chickenList.innerHTML = '<tr><td colspan="6" class="text-muted text-center">Žádné slepice k zobrazení.</td></tr>';
        return;
    }

    slepice.forEach(slepiceItem => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${slepiceItem.druh}</td>
            <td>${slepiceItem.datumZakoupeni} (${slepiceItem.stariPriZakoupeni} týdnů)</td>
            <td>${slepiceItem.datumUmrti ? `${slepiceItem.datumUmrti} (${slepiceItem.stariPriUmrti || '?'} týdnů)` : 'Žije'}</td>
            <td>${slepiceItem.barvaKrouzku || ''} ${slepiceItem.cisloKrouzku || ''} ${slepiceItem.stranaKrouzku || ''}</td>
            <td>${slepiceItem.porizovaci_cena} Kč</td>
            <td class="actions">
                <button class="edit-btn" data-id="${slepiceItem.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" data-id="${slepiceItem.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        chickenList.appendChild(row);
    });

    // Přidáme event listenery na nově vytvořená tlačítka
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const id = event.currentTarget.dataset.id;
            editChicken(id, slepice);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const id = event.currentTarget.dataset.id;
            openDeleteConfirmModal(id);
        });
    });
}

function updateStatistics(slepice) {
    const totalChickens = slepice.length;
    let totalAge = 0;
    let totalCost = 0;
    let livingChickensCount = 0;

    slepice.forEach(chicken => {
        totalCost += parseFloat(chicken.porizovaci_cena || 0);

        if (!chicken.datumUmrti && chicken.datumZakoupeni && chicken.stariPriZakoupeni) {
            const acquiredDate = new Date(chicken.datumZakoupeni);
            const today = new Date();
            const diffTime = Math.abs(today - acquiredDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const diffWeeks = Math.floor(diffDays / 7);
            const currentAge = parseInt(chicken.stariPriZakoupeni) + diffWeeks;
            totalAge += currentAge;
            livingChickensCount++;
        } else if (chicken.datumUmrti && chicken.stariPriUmrti) {
            totalAge += parseInt(chicken.stariPriUmrti); // Započítáme stáří při úmrtí pro průměr
            livingChickensCount++; // Započítáme i uhynulé pro průměr, ale můžeme se rozhodnout jinak
        }
    });

    totalChickensElement.textContent = totalChickens;
    averageAgeElement.textContent = livingChickensCount > 0 ? `${Math.floor(totalAge / livingChickensCount)} týdnů` : '0 týdnů';
    totalCostElement.textContent = `${totalCost.toFixed(2)} Kč`;
}


function openDeleteConfirmModal(id) {
    chickenToDeleteId = id;
    deleteConfirmModal.classList.add('show');
}

async function handleDeleteChicken() {
    if (chickenToDeleteId) {
        await deleteChickenFromFirestore(chickenToDeleteId);
        chickenToDeleteId = null;
        deleteConfirmModal.classList.remove('show');
    }
}

function editChicken(id, slepice) {
    const chicken = slepice.find(c => c.id === id);
    if (chicken) {
        modalTitle.textContent = 'Upravit slepici';
        chickenIdInput.value = chicken.id;
        druhInput.value = chicken.druh;
        datumZakoupeniInput.value = chicken.datumZakoupeni;
        stariPriZakoupeniInput.value = chicken.stariPriZakoupeni;
        datumUmrtiInput.value = chicken.datumUmrti || '';
        barvaKrouzkuInput.value = chicken.barvaKrouzku || '';
        cisloKrouzkuInput.value = chicken.cisloKrouzku || '';
        stranaKrouzkuInput.value = chicken.stranaKrouzku || '';
        porizovaci_cenaInput.value = chicken.porizovaci_cena;

        // Zobrazení a výpočet stáří při úmrtí, pokud je datum úmrtí
        if (chicken.datumUmrti) {
            stariPriUmrtiGroup.style.display = 'block';
            stariPriUmrtiInput.value = chicken.stariPriUmrti || 'N/A'; // N/A pokud není vypočítáno
        } else {
            stariPriUmrtiGroup.style.display = 'none';
            stariPriUmrtiInput.value = '';
        }
        resetErrorMessages();
        chickenModal.classList.add('show');
    }
}

// Funkce pro validaci formuláře
function validateForm() {
    resetErrorMessages();
    let isValid = true;

    if (!druhInput.value.trim()) {
        displayInputError('druh', 'Druh je povinný.');
        isValid = false;
    }
    if (!datumZakoupeniInput.value) {
        displayInputError('datumZakoupeni', 'Datum zakoupení je povinné.');
        isValid = false;
    }
    if (!stariPriZakoupeniInput.value || parseInt(stariPriZakoupeniInput.value) < 0) {
        displayInputError('stariPriZakoupeni', 'Stáří při zakoupení musí být kladné číslo.');
        isValid = false;
    }
    if (!porizovaci_cenaInput.value || parseFloat(porizovaci_cenaInput.value) < 0) {
        displayInputError('porizovaci_cena', 'Pořizovací cena musí být kladné číslo.');
        isValid = false;
    }

    // Validace dat úmrtí vs. zakoupení
    if (datumUmrtiInput.value && datumZakoupeniInput.value) {
        const datumZakoupeni = new Date(datumZakoupeniInput.value);
        const datumUmrti = new Date(datumUmrtiInput.value);

        if (datumUmrti < datumZakoupeni) {
            displayInputError('datumUmrti', 'Datum úmrtí musí být pozdější než datum zakoupení.');
            isValid = false;
        }
    }

    return isValid;
}

// Funkce pro zpracování odeslání formuláře
async function handleChickenFormSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
        showStatusMessage('Prosím opravte chyby ve formuláři.', 'danger');
        return;
    }

    const newChicken = {
        druh: druhInput.value.trim(),
        datumZakoupeni: datumZakoupeniInput.value,
        stariPriZakoupeni: parseInt(stariPriZakoupeniInput.value),
        datumUmrti: datumUmrtiInput.value || null,
        stariPriUmrti: stariPriUmrtiInput.value ? parseInt(stariPriUmrtiInput.value) : null,
        barvaKrouzku: barvaKrouzkuInput.value.trim(),
        cisloKrouzku: cisloKrouzkuInput.value.trim(),
        stranaKrouzku: stranaKrouzkuInput.value.trim(),
        porizovaci_cena: parseFloat(porizovaci_cenaInput.value)
    };

    if (chickenIdInput.value) {
        newChicken.id = chickenIdInput.value; // Pro aktualizaci existujícího
    }

    await saveChickenToFirestore(newChicken);
    chickenModal.classList.remove('show');
}


// Funkce pro výpočet stáří při úmrtí
function calculateStariPriUmrti() {
    const datumZakoupeniVal = datumZakoupeniInput.value;
    const stariPriZakoupeniVal = stariPriZakoupeniInput.value;
    const datumUmrtiVal = datumUmrtiInput.value;

    stariPriUmrtiGroup.style.display = 'none';
    stariPriUmrtiInput.value = '';

    // Zrušíme chybu, pokud uživatel smaže datum úmrtí
    displayInputError('datumUmrti', '');
    datumUmrtiInput.classList.remove('input-error');

    if (datumUmrtiVal && datumZakoupeniVal && stariPriZakoupeniVal) {
        const datumZakoupeni = new Date(datumZakoupeniVal);
        const datumUmrti = new Date(datumUmrtiVal);
        const stariPriZakoupeni = parseInt(stariPriZakoupeniVal);

        if (datumUmrti <= datumZakoupeni) {
            displayInputError('datumUmrti', 'Datum úmrtí musí být pozdější než datum zakoupení.');
            return;
        }

        const rozdilDny = Math.floor((datumUmrti - datumZakoupeni) / (1000 * 60 * 60 * 24));
        const rozdilTydny = Math.floor(rozdilDny / 7);

        const stariPriUmrti = stariPriZakoupeni + rozdilTydny;

        stariPriUmrtiInput.value = stariPriUmrti;
        stariPriUmrtiGroup.style.display = 'block';
    }
}

// Funkce pro filtrování slepic
function filterChickens() {
    const searchTerm = searchInput.value.toLowerCase();
    if (chickenCollectionRef) {
        // Vzhledem k tomu, že onSnapshot už data získává a renderuje,
        // budeme filtrovat z aktuálně zobrazených dat, ne znovu z Firestore.
        // Pro sofistikovanější filtrování by se musely použít dotazy Firestore
        // např. `chickenCollectionRef.where('druh', '==', searchTerm)`
        // což by vyžadovalo více logiky pro indexování atd.

        // Aktuálně zobrazené slepice (předpokládáme, že jsou dostupné přes global/scope)
        // Lepší by bylo předat aktuální pole slepic funkci renderSlepice a filtrovat ho před renderem.
        // Nyní budeme filtrovat DOM prvky, což není ideální, ale pro malé dataset to funguje.
        const rows = chickenList.querySelectorAll('tr');
        rows.forEach(row => {
            const textContent = row.textContent.toLowerCase();
            if (textContent.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
}

