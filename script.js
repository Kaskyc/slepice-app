// Globální proměnné pro Firebase
let auth, db, currentUser;

// Inicializace Firebase reference
function initFirebase() {
    try {
        console.log("Inicializace Firebase referencí...");
        if (typeof firebase !== 'undefined' && firebase.app) {
            auth = firebase.auth();
            db = firebase.firestore();
            
            // Kontrola stavu přihlášení při inicializaci
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log("Uživatel přihlášen:", user.displayName);
                    currentUser = user;
                    document.getElementById('login-status').textContent = `Přihlášen jako: ${user.displayName}`;
                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('logout-section').style.display = 'flex';
                    
                    // Načtení dat uživatele
                    loadUserData();
                } else {
                    console.log("Žádný přihlášený uživatel");
                    currentUser = null;
                    document.getElementById('login-section').style.display = 'flex';
                    document.getElementById('logout-section').style.display = 'none';
                    
                    // Načtení lokálních dat
                    loadData();
                    updateStats();
                }
            });
            
            if (document.getElementById('firebase-status')) {
                document.getElementById('firebase-status').style.display = 'none';
            }
            
            return true;
        } else {
            throw new Error("Firebase není dostupný");
        }
    } catch (error) {
        console.error("Chyba při inicializaci Firebase:", error);
        if (document.getElementById('firebase-status')) {
            document.getElementById('firebase-status').style.display = 'block';
        }
        return false;
    }
}

// Přihlášení pomocí Google účtu
function signInWithGoogle() {
    try {
        console.log("Pokus o přihlášení pomocí Google...");
        if (!auth) {
            console.error("Firebase Auth není inicializován!");
            alert("Nepodařilo se inicializovat Firebase Auth. Zkuste obnovit stránku.");
            return;
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                console.log("Přihlášení úspěšné:", result.user.displayName);
            })
            .catch((error) => {
                console.error("Chyba při přihlašování:", error);
                alert("Nepodařilo se přihlásit: " + error.message);
            });
    } catch (error) {
        console.error("Chyba při pokusu o přihlášení:", error);
        alert("Nastala chyba při přihlašování: " + error.message);
    }
}

// Odhlášení
function signOut() {
    if (!auth) return;
    
    auth.signOut()
        .then(() => {
            console.log("Odhlášení úspěšné");
        })
        .catch((error) => {
            console.error("Chyba při odhlašování:", error);
            alert("Chyba při odhlašování: " + error.message);
        });
}

// Načtení dat uživatele z Firebase
function loadUserData() {
    if (!currentUser || !db) {
        console.error("Nelze načíst data - uživatel nebo databáze nejsou k dispozici");
        return;
    }
    
    console.log("Načítání dat z Firestore pro uživatele:", currentUser.uid);
    db.collection('users').doc(currentUser.uid).collection('slepice').get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                console.log("Nalezena data v Firestore, počet záznamů:", querySnapshot.size);
                const userData = [];
                querySnapshot.forEach((doc) => {
                    userData.push(doc.data());
                });
                
                slepice = userData;
                
                // Aktualizace statistik
                updateStats();
                
                // Uložení do localStorage jako záloha
                localStorage.setItem('slepice-data', JSON.stringify(slepice));
            } else {
                console.log("Žádná data v Firestore, použijeme lokální data");
                loadData();
                if (slepice.length > 0) {
                    saveUserData();
                }
                updateStats();
            }
        })
        .catch((error) => {
            console.error("Chyba při načítání dat z Firestore:", error);
            loadData();
            updateStats();
        });
}

// Uložení dat uživatele do Firebase
function saveUserData() {
    if (!currentUser || !db) {
        console.error("Nelze uložit data - uživatel nebo databáze nejsou k dispozici");
        return;
    }
    
    console.log("Ukládání dat do Firestore pro uživatele:", currentUser.uid);
    
    db.collection('users').doc(currentUser.uid).collection('slepice').get()
        .then((querySnapshot) => {
            const firestoreIds = [];
            querySnapshot.forEach(doc => {
                firestoreIds.push(doc.id);
            });
            
            const currentIds = slepice.map(s => s.id.toString());
            const idsToDelete = firestoreIds.filter(id => !currentIds.includes(id));
            
            const deletePromises = idsToDelete.map(id => {
                console.log(`Odstraňuji záznam s ID ${id} z Firestore`);
                return db.collection('users').doc(currentUser.uid).collection('slepice').doc(id).delete();
            });
            
            const savePromises = slepice.map(s => {
                return db.collection('users').doc(currentUser.uid).collection('slepice').doc(s.id.toString())
                    .set(s)
                    .then(() => {
                        console.log(`Slepice ID ${s.id} úspěšně uložena`);
                    })
                    .catch(error => {
                        console.error(`Chyba při ukládání slepice ID ${s.id}:`, error);
                    });
            });
            
            return Promise.all([...deletePromises, ...savePromises]);
        })
        .then(() => {
            console.log("Všechna data úspěšně aktualizována v Firestore");
        })
        .catch((error) => {
            console.error("Chyba při aktualizaci dat v Firestore:", error);
        });
}

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
        stranaKrouzku: "", 
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
        stranaKrouzku: "", 
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
        stranaKrouzku: "", 
        porizovaci_cena: 320 
    }
];

// Načtení dat z localStorage při startu
function loadData() {
    const savedData = localStorage.getItem('slepice-data');
    if (savedData) {
        try {
            slepice = JSON.parse(savedData);
            console.log("Data načtena z localStorage, počet záznamů:", slepice.length);
        } catch (e) {
            console.error('Chyba při načítání dat z localStorage:', e);
        }
    } else {
        console.log("Žádná data v localStorage, použijeme výchozí data");
    }
}

// Uložení dat do localStorage
function saveData() {
    localStorage.setItem('slepice-data', JSON.stringify(slepice));
    console.log("Data uložena do localStorage, počet záznamů:", slepice.length);
    
    if (currentUser) {
        saveUserData();
    }
}

// Přepínání mezi hlavním a detailním pohledem
function showMainView() {
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('detail-view').style.display = 'none';
}

function showDetailView() {
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    
    // Načtení a zobrazení dat
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
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
const originalDruhInput = document.getElementById('originalDruh');
const druhInput = document.getElementById('druh');
const datumZakoupeniInput = document.getElementById('datumZakoupeni');
const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
const datumUmrtiInput = document.getElementById('datumUmrti');
const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
const barvaKrouzkuInput = document.getElementById('barvaKrouzku');
const cisloKrouzkuInput = document.getElementById('cisloKrouzku');
const stranaKrouzkuInput = document.getElementById('strana-krouzku');
const porizovaci_cenaInput = document.getElementById('porizovaci_cena');
const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
const pocetSlepicInput = document.getElementById('pocet-slepic');
const hromadnePridaniContainer = document.getElementById('hromadne-pridani-container');
const druhyDatalist = document.getElementById('druhy-datalist');
const breedRestrictionError = document.getElementById('breed-restriction-error');

const deleteModal = document.getElementById('delete-modal');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');
const deleteSlepiceName = document.getElementById('delete-slepice-name');

const statTotal = document.getElementById('stat-total');
const statInvestment = document.getElementById('stat-investment');
const statHistorical = document.getElementById('stat-historical');

// Funkce pro výpočet a formátování aktuálního stáří skupiny slepic
function calculateGroupAge(purchaseDate, initialAgeWeeks) {
    if (!purchaseDate) return "-";
    
    const today = new Date();
    const zakoupeni = new Date(purchaseDate);
    
    const rozdilDny = Math.floor((today - zakoupeni) / (1000 * 60 * 60 * 24));
    const rozdilTydny = Math.floor(rozdilDny / 7);
    
    const celkoveTydny = rozdilTydny + initialAgeWeeks;
    
    return formatAge(celkoveTydny);
}

// Funkce pro formátování věku
function formatAge(weeks) {
    if (!weeks || isNaN(weeks)) return "-";
    
    if (weeks < 26) {
        return `${weeks} týdnů`;
    }
    else if (weeks < 52) {
        const months = Math.floor(weeks / 4.33);
        return `${months} měsíců`;
    }
    else {
        const years = Math.floor(weeks / 52);
        const months = Math.floor((weeks % 52) / 4.33);
        if (months === 0) {
            return years === 1 ? `1 rok` : `${years} roky`;
        } else {
            return years === 1 
                ? `1 rok ${months} měsíců` 
                : `${years} roky ${months} měsíců`;
        }
    }
}

// Funkce pro seskupení slepic podle data zakoupení
function groupSlepiceByDate(slepiceList) {
    const groups = {};
    
    slepiceList.forEach(slepice => {
        if (!groups[slepice.datumZakoupeni]) {
            groups[slepice.datumZakoupeni] = [];
        }
        groups[slepice.datumZakoupeni].push(slepice);
    });
    
    return Object.keys(groups).map(datum => {
        const slepiceGroup = groups[datum];
        const zive = slepiceGroup.filter(s => !s.datumUmrti).length;
        const celkovaCena = slepiceGroup.reduce((sum, s) => sum + (parseInt(s.porizovaci_cena) || 0), 0);
        
        const druhy = [...new Set(slepiceGroup.map(s => s.druh))];
        const barvy = [...new Set(slepiceGroup.map(s => s.barvaKrouzku).filter(b => b))];
        
        const cislaKrouzku = slepiceGroup
            .map(s => s.cisloKrouzku)
            .filter(c => c && !isNaN(parseInt(c)))
            .map(c => parseInt(c))
            .sort((a, b) => a - b);
        
        let rozsahCisel = "";
        if (cislaKrouzku.length > 0) {
            const min = cislaKrouzku[0];
            const max = cislaKrouzku[cislaKrouzku.length - 1];
            rozsahCisel = min === max ? min.toString() : `${min}-${max}`;
        }
        
        const strany = slepiceGroup
            .map(s => s.stranaKrouzku)
            .filter(s => s)
            .reduce((acc, strana) => {
                acc[strana] = (acc[strana] || 0) + 1;
                return acc;
            }, {});
        
        let stranyText = "";
        if (Object.keys(strany).length > 0) {
            stranyText = Object.entries(strany)
                .map(([strana, pocet]) => `${strana} (${pocet})`)
                .join(", ");
        }
        
        let statusClass = 'group-status-healthy';
        if (zive === 0) {
            statusClass = 'group-status-danger';
        } else if (zive / slepiceGroup.length < 0.5) {
            statusClass = 'group-status-warning';
        }
        
        // Výpočet průměrného stáří při zakoupení
        const averageInitialAge = slepiceGroup.reduce((sum, s) => sum + (parseInt(s.stariPriZakoupeni) || 0), 0) / slepiceGroup.length;
        
        return {
            datum: datum,
            slepice: slepiceGroup,
            pocet: slepiceGroup.length,
            zive: zive,
            celkovaCena: celkovaCena,
            druhy: druhy.join(", "),
            barvy: barvy,
            rozsahCisel: rozsahCisel,
            strany: stranyText,
            statusClass: statusClass,
            averageInitialAge: averageInitialAge
        };
    }).sort((a, b) => new Date(b.datum) - new Date(a.datum));
}

// Funkce pro získání CSS třídy pro barvu kroužku
function getRingColorClass(barva) {
    if (!barva) return 'ring-none';
    
    switch (barva.toLowerCase()) {
        case 'červená': return 'ring-red';
        case 'zelená': return 'ring-green';
        case 'žlutá': return 'ring-yellow';
        case 'modrá': return 'ring-blue';
        default: return 'ring-none';
    }
}

// Funkce pro zobrazení skupin na hlavní stránce
function renderSlepiceGroups(groups) {
    slepiceTableBody.innerHTML = '';
    
    if (groups.length === 0) {
        slepiceTableBody.innerHTML = `
            <tr>
                <td colspan="8">
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
    
    groups.forEach(group => {
        const row = document.createElement('tr');
        row.classList.add('group-row');
        row.dataset.date = group.datum;
        
        let barvyHTML = "";
        if (group.barvy && group.barvy.length > 0) {
            barvyHTML = group.barvy.map(barva => {
                const colorClass = getRingColorClass(barva);
                return `
                    <div class="ring-color-container">
                        <span class="ring-color ${colorClass}"></span>
                        <span class="ring-color-text">${barva}</span>
                    </div>
                `;
            }).join('');
        } else {
            barvyHTML = '<span class="text-secondary">-</span>';
        }
        
        const statusHTML = `
            <div class="group-status ${group.statusClass}">
                ${group.zive} z ${group.pocet}
            </div>
        `;
        
        const currentAge = calculateGroupAge(group.datum, group.averageInitialAge);
        
        row.innerHTML = `
            <td>
                <div class="group-header">
                    <button class="btn-toggle">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    ${group.druhy}
                </div>
            </td>
            <td>${formatDate(group.datum)}</td>
            <td>
                <div class="age-display">
                    <span class="age-value">${currentAge}</span>
                </div>
            </td>
            <td>
                ${group.pocet} ${statusHTML}
            </td>
            <td>${group.celkovaCena} Kč</td>
            <td>${barvyHTML}</td>
            <td>${group.rozsahCisel || group.strany || "-"}</td>
            <td class="actions">
                <button class="icon-btn add-to-group-btn" data-date="${group.datum}" data-druh="${group.druhy}" title="Přidat do skupiny">
                    <i class="fas fa-plus-circle"></i>
                </button>
                <button class="icon-btn edit-group-btn" data-date="${group.datum}" title="Upravit skupinu">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete-group-btn" data-date="${group.datum}" title="Smazat skupinu">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        slepiceTableBody.appendChild(row);
        
        const detailRow = document.createElement('tr');
        detailRow.classList.add('detail-row');


// Funkce pro zobrazení detailů skupiny
function renderGroupDetails(date) {
    const detailTableBody = document.querySelector(`.detail-table-body[data-date="${date}"]`);
    if (!detailTableBody) return;
    
    const groupSlepice = slepice.filter(s => s.datumZakoupeni === date);
    
    detailTableBody.innerHTML = '';
    
    groupSlepice.forEach(slepice => {
        const row = document.createElement('tr');
        
        let krouzekInfo = "-";
        if (slepice.cisloKrouzku) {
            const barva = slepice.barvaKrouzku || '';
            const colorClass = getRingColorClass(barva);
            krouzekInfo = `
                <div class="ring-color-container">
                    <span class="ring-color ${colorClass}"></span>
                    <span>č. ${slepice.cisloKrouzku}</span>
                </div>
            `;
        } else if (slepice.stranaKrouzku) {
            const barva = slepice.barvaKrouzku || '';
            const colorClass = getRingColorClass(barva);
            krouzekInfo = `
                <div class="ring-color-container">
                    <span class="ring-color ${colorClass}"></span>
                    <span>${slepice.stranaKrouzku} strana</span>
                </div>
            `;
        }
        
        let stariHtml = '';
        
        if (slepice.datumUmrti) {
            stariHtml = `
                <div>
                    ${formatDate(slepice.datumUmrti)}
                </div>
                <div class="age-display">
                    <span class="age-value">${formatAge(slepice.stariPriUmrti)}</span>
                </div>
            `;
        } else {
            const today = new Date();
            const zakoupeni = new Date(slepice.datumZakoupeni);
            const tydnuOdZakoupeni = Math.floor((today - zakoupeni) / (1000 * 60 * 60 * 24 * 7));
            const celkoveTydnu = tydnuOdZakoupeni + (slepice.stariPriZakoupeni || 0);
            
            stariHtml = `
                <span class="status status-active">Žije</span>
                <div class="age-display">
                    <span class="age-value">${formatAge(celkoveTydnu)}</span>
                </div>
            `;
        }
        
        row.innerHTML = `
            <td>${slepice.druh}</td>
            <td>
                <div class="age-display">
                    <span class="age-value">${formatAge(slepice.stariPriZakoupeni)}</span>
                </div>
            </td>
            <td>${stariHtml}</td>
            <td>${krouzekInfo}</td>
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
        
        detailTableBody.appendChild(row);
    });
    
    detailTableBody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    
    detailTableBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
    });
}

// Formátování data
function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
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
    
    if (statTotal) statTotal.textContent = activeSlepice.length;
    if (statInvestment) statInvestment.textContent = `${totalInvestment} Kč`;
    if (statHistorical) statHistorical.textContent = historicalSlepice.length;
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

// Přepínání mezi číslem kroužku a stranou
function toggleKrouzekTyp() {
    const typCislo = document.getElementById('typ-krouzku-cislo').checked;
    const typStrana = document.getElementById('typ-krouzku-strana').checked;
    
    document.getElementById('cislo-krouzku-group').style.display = typCislo ? 'block' : 'none';
    document.getElementById('strana-krouzku-group').style.display = typStrana ? 'block' : 'none';
    
    const isHromadneEnabled = hromadnePridaniCheck && hromadnePridaniCheck.checked;
    
    if (isHromadneEnabled && typStrana) {
        if (document.getElementById('pocet-slepic-error')) {
            document.getElementById('pocet-slepic-error').textContent = 
                'Při hromadném přidání budou všechny slepice označeny zvolenou stranou kroužku.';
        }
    } else if (document.getElementById('pocet-slepic-error')) {
        document.getElementById('pocet-slepic-error').textContent = '';
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
    
    if (datumUmrti <= datumZakoupeni) {
        document.getElementById('datumUmrti-error').textContent = 'Datum úmrtí musí být pozdější než datum zakoupení';
        return;
    }
    
    const rozdilDny = Math.floor((datumUmrti - datumZakoupeni) / (1000 * 60 * 60 * 24));
    const rozdilTydny = Math.floor(rozdilDny / 7);
    
    const stariPriUmrti = stariPriZakoupeni + rozdilTydny;
    
    stariPriUmrtiInput.value = stariPriUmrti;
}

// Kontrola omezení na jeden druh slepic ve skupině
function checkBreedRestriction() {
    const selectedDatum = datumZakoupeniInput.value;
    const selectedDruh = druhInput.value.trim();
    const originalDruh = originalDruhInput.value.trim();
    
    if (slepiceIdInput.value && selectedDruh === originalDruh) {
        breedRestrictionError.style.display = 'none';
        return true;
    }
    
    if (!selectedDruh || !selectedDatum) {
        breedRestrictionError.style.display = 'none';
        return true;
    }
    
    const existingSlepice = slepice.filter(s => s.datumZakoupeni === selectedDatum);
    if (existingSlepice.length > 0) {
        const existingDruh = existingSlepice[0].druh;
        if (existingDruh !== selectedDruh) {
            breedRestrictionError.style.display = 'block';
            return false;
        }
    }
    
    breedRestrictionError.style.display = 'none';
    return true;
}

// Přepnutí zobrazení hromadného přidání
function toggleHromadnePridani() {
    if (!hromadnePridaniContainer || !hromadnePridaniCheck) return;
    
    hromadnePridaniContainer.style.display = hromadnePridaniCheck.checked ? 'block' : 'none';
    
    toggleKrouzekTyp();
}

// Otevření modálního okna pro přidání s předvyplněným datem
function openAddModal(predvyplnenyDatum = null, predvyplnenyDruh = null) {
    modalTitle.textContent = 'Přidat novou slepici';
    slepiceForm.reset();
    slepiceIdInput.value = '';
    originalDruhInput.value = '';
    
    document.getElementById('typ-krouzku-cislo').checked = true;
    toggleKrouzekTyp();
    
    if (predvyplnenyDatum) {
        datumZakoupeniInput.value = predvyplnenyDatum;
    } else {
        const today = new Date().toISOString().split('T')[0];
        datumZakoupeniInput.value = today;
    }
    
    if (predvyplnenyDruh) {
        druhInput.value = predvyplnenyDruh;
    }
    
    checkBreedRestriction();
    
    document.getElementById('stariPriUmrti-group').style.display = 'none';
    
    updateDruhyDatalist();
    populateCislaKrouzku();
    
    if (hromadnePridaniCheck) {
        hromadnePridaniCheck.checked = false;
        toggleHromadnePridani();
        
        document.getElementById('hromadne-pridani-section').style.display = 'block';
    }
    
    slepiceModal.classList.add('active');
}

// Otevření modálního okna pro editaci
function openEditModal(id) {
    const slepiceToEdit = slepice.find(s => s.id === id);
    if (!slepiceToEdit) return;
    
    modalTitle.textContent = 'Upravit záznam';
    
    slepiceIdInput.value = slepiceToEdit.id;
    originalDruhInput.value = slepiceToEdit.druh;
    druhInput.value = slepiceToEdit.druh;
    datumZakoupeniInput.value = slepiceToEdit.datumZakoupeni;
    stariPriZakoupeniInput.value = slepiceToEdit.stariPriZakoupeni;
    datumUmrtiInput.value = slepiceToEdit.datumUmrti || '';
    
    document.getElementById('stariPriUmrti-group').style.display = slepiceToEdit.datumUmrti ? 'block' : 'none';
    stariPriUmrtiInput.value = slepiceToEdit.stariPriUmrti || '';
    barvaKrouzkuInput.value = slepiceToEdit.barvaKrouzku || '';
    
    if (slepiceToEdit.stranaKrouzku) {
        document.getElementById('typ-krouzku-strana').checked = true;
        document.getElementById('strana-krouzku').value = slepiceToEdit.stranaKrouzku;
        toggleKrouzekTyp();
    } else {
        document.getElementById('typ-krouzku-cislo').checked = true;
        toggleKrouzekTyp();
        
        populateCislaKrouzku();
        
        if (slepiceToEdit.cisloKrouzku) {
            if (/^\d+$/.test(slepiceToEdit.cisloKrouzku) && parseInt(slepiceToEdit.cisloKrouzku) >= 1 && parseInt(slepiceToEdit.cisloKrouzku) <= 20) {
                cisloKrouzkuInput.value = slepiceToEdit.cisloKrouzku;
            } else {
                const option = document.createElement('option');
                option.value = slepiceToEdit.cisloKrouzku;
                option.textContent = slepiceToEdit.cisloKrouzku;
                cisloKrouzkuInput.appendChild(option);
                cisloKrouzkuInput.value = slepiceToEdit.cisloKrouzku;
            }
        } else {
            cisloKrouzkuInput.value = '';
        }
    }
    
    porizovaci_cenaInput.value = slepiceToEdit.porizovaci_cena || '';
    
    if (document.getElementById('hromadne-pridani-section')) {
        document.getElementById('hromadne-pridani-section').style.display = 'none';
    }
    
    updateDruhyDatalist();
    checkBreedRestriction();
    
    slepiceModal.classList.add('active');
}

// Otevření modálního okna pro hromadnou editaci skupiny
function openGroupEditModal(date) {
    const groupSlepice = slepice.filter(s => s.datumZakoupeni === date);
    if (groupSlepice.length === 0) return;
    
    document.getElementById('group-date').value = date;
    document.getElementById('group-druh').value = groupSlepice[0].druh;
    document.getElementById('group-barvaKrouzku').value = '';
    document.getElementById('group-porizovaci_cena').value = '';
    
    // Aktualizace datalistu pro druhy
    const groupDruhyDatalist = document.getElementById('group-druhy-datalist');
    groupDruhyDatalist.innerHTML = '';
    const uniqueDruhy = [...new Set(slepice.map(s => s.druh))];
    uniqueDruhy.forEach(druh => {
        const option = document.createElement('option');
        option.value = druh;
        groupDruhyDatalist.appendChild(option);
    });
    
    document.getElementById('group-edit-modal').classList.add('active');
}

// Uložení hromadné editace skupiny
function saveGroupEdit() {
    const date = document.getElementById('group-date').value;
    const newDruh = document.getElementById('group-druh').value.trim();
    const newBarva = document.getElementById('group-barvaKrouzku').value;
    const newCena = document.getElementById('group-porizovaci_cena').value;
    
    const groupSlepice = slepice.filter(s => s.datumZakoupeni === date);
    
    groupSlepice.forEach(s => {
        if (newDruh) s.druh = newDruh;
        if (newBarva) s.barvaKrouzku = newBarva === 'žádná' ? '' : newBarva;
        if (newCena) s.porizovaci_cena = parseInt(newCena);
    });
    
    saveData();
    
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
    updateStats();
    
    closeModal(document.getElementById('group-edit-modal'));
}

// Otevření modálního okna pro potvrzení smazání
function openDeleteModal(id) {
    const slepiceToDelete = slepice.find(s => s.id === id);
    if (!slepiceToDelete) return;
    
    deleteSlepiceName.textContent = `"${slepiceToDelete.druh}" (${slepiceToDelete.cisloKrouzku || slepiceToDelete.stranaKrouzku || 'bez označení'})`;
    deleteConfirm.dataset.id = id;
    
    deleteModal.classList.add('active');
}

// Otevření modálního okna pro potvrzení smazání skupiny
function openDeleteGroupModal(date) {
    const groupSlepice = slepice.filter(s => s.datumZakoupeni === date);
    if (groupSlepice.length === 0) return;
    
    const druh = groupSlepice[0].druh;
    const pocet = groupSlepice.length;
    
    document.getElementById('delete-group-info').textContent = 
        `Skupina "${druh}" z ${formatDate(date)} (${pocet} slepic)`;
    
    document.getElementById('delete-group-confirm').dataset.date = date;
    document.getElementById('delete-group-modal').classList.add('active');
}

// Smazání celé skupiny
function deleteGroup(date) {
    slepice = slepice.filter(s => s.datumZakoupeni !== date);
    
    saveData();
    
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
    updateStats();
    
    closeModal(document.getElementById('delete-group-modal'));
}

// Zavření modálního okna
function closeModal(modal) {
    modal.classList.remove('active');
    
    document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
    });
    
    document.querySelectorAll('.form-control').forEach(el => {
        el.classList.remove('error');
    });
    
    if (breedRestrictionError) {
        breedRestrictionError.style.display = 'none';
    }
}

// Validace formuláře
function validateForm() {
    let isValid = true;
    
    const requiredFields = [
        { id: 'druh', message: 'Zadejte druh slepice' },
        { id: 'datumZakoupeni', message: 'Vyberte datum zakoupení' },
        { id: 'stariPriZakoupeni', message: 'Zadejte stáří při zakoupení' }
    ];
    
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
    
    const datumUmrti = datumUmrtiInput.value;
    
    if (datumUmrti) {
        if (!stariPriUmrtiInput.value) {
            calculateStariPriUmrti();
        }
        
        const datumZakoupeni = new Date(datumZakoupeniInput.value);
        const datumUmrtiDate = new Date(datumUmrti);
        
        if (datumUmrtiDate <= datumZakoupeni) {
            datumUmrtiInput.classList.add('error');
            document.getElementById('datumUmrti-error').textContent = 'Datum úmrtí musí být pozdější než datum zakoupení';
            isValid = false;
        }
    }
    
    const typCislo = document.getElementById('typ-krouzku-cislo').checked;
    const typStrana = document.getElementById('typ-krouzku-strana').checked;
    
    if (hromadnePridaniCheck && hromadnePridaniCheck.checked) {
        if (!pocetSlepicInput.value || parseInt(pocetSlepicInput.value) < 2) {
            pocetSlepicInput.classList.add('error');
            document.getElementById('pocet-slepic-error').textContent = 'Zadejte počet slepic (minimálně 2)';
            isValid = false;
        } else {
            pocetSlepicInput.classList.remove('error');
        }
        
        if (typCislo && !cisloKrouzkuInput.value) {
            cisloKrouzkuInput.classList.add('error');
            document.getElementById('cisloKrouzku-error').textContent = 'Pro hromadné přidání musíte zadat číslo prvního kroužku';
            isValid = false;
        }
    }
    
    if (!checkBreedRestriction()) {
        druhInput.classList.add('error');
        document.getElementById('druh-error').textContent = 'Všechny slepice ve skupině musí být stejného druhu';
        isValid = false;
    }
    
    return isValid;
}

// Generování stejných stran pro hromadné přidání
function generateSameStrany(count, strana) {
    const sides = [];
    for (let i = 0; i < count; i++) {
        sides.push(strana);
    }
    return sides;
}

// Uložení formuláře
function saveForm() {
    if (!validateForm()) return;
    
    const slepiceId = slepiceIdInput.value;
    const isEditing = slepiceId !== '';
    
    const typCislo = document.getElementById('typ-krouzku-cislo').checked;
    const typStrana = document.getElementById('typ-krouzku-strana').checked;
    
    const baseSlepice = {
        druh: druhInput.value,
        datumZakoupeni: datumZakoupeniInput.value,
        stariPriZakoupeni: parseInt(stariPriZakoupeniInput.value),
        datumUmrti: datumUmrtiInput.value || '',
        stariPriUmrti: stariPriUmrtiInput.value ? parseInt(stariPriUmrtiInput.value) : null,
        barvaKrouzku: barvaKrouzkuInput.value,
        porizovaci_cena: porizovaci_cenaInput.value ? parseInt(porizovaci_cenaInput.value) : null,
        cisloKrouzku: typCislo ? cisloKrouzkuInput.value : '',
        stranaKrouzku: typStrana ? stranaKrouzkuInput.value : ''
    };
    
    if (isEditing) {
        const updatedSlepice = {
            id: parseInt(slepiceId),
            ...baseSlepice
        };
        
        const index = slepice.findIndex(s => s.id === parseInt(slepiceId));
        if (index !== -1) {
            slepice[index] = updatedSlepice;
        }
    } else {
        if (hromadnePridaniCheck && hromadnePridaniCheck.checked && pocetSlepicInput.value) {
            const pocet = parseInt(pocetSlepicInput.value);
            const startId = slepice.length > 0 ? Math.max(...slepice.map(s => s.id)) + 1 : 1;
            
            if (typCislo) {
                let baseKrouzek = parseInt(cisloKrouzkuInput.value);
                if (isNaN(baseKrouzek)) {
                    baseKrouzek = 1;
                }
                
                for (let i = 0; i < pocet; i++) {
                    const novaSlepice = {
                        id: startId + i,
                        ...baseSlepice,
                        cisloKrouzku: (baseKrouzek + i).toString(),
                        stranaKrouzku: ''
                    };
                    
                    slepice.push(novaSlepice);
                }
            } else if (typStrana) {
                const vybranaStrana = stranaKrouzkuInput.value;
                const strany = generateSameStrany(pocet, vybranaStrana);
                
                for (let i = 0; i < pocet; i++) {
                    const novaSlepice = {
                        id: startId + i,
                        ...baseSlepice,
                        cisloKrouzku: '',
                        stranaKrouzku: strany[i]
                    };
                    
                    slepice.push(novaSlepice);
                }
            }
        } else {
            const novaSlepice = {
                id: slepice.length > 0 ? Math.max(...slepice.map(s => s.id)) + 1 : 1,
                ...baseSlepice
            };
            
            slepice.push(novaSlepice);
        }
    }
    
    saveData();
    
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
    updateStats();
    
    closeModal(slepiceModal);
}

// Odstranění slepice
function deleteSlepice(id) {
    const index = slepice.findIndex(s => s.id === id);
    if (index !== -1) {
        slepice.splice(index, 1);
        
        saveData();
        
        const groups = groupSlepiceByDate(slepice);
        renderSlepiceGroups(groups);
        updateStats();
    }
    
    closeModal(deleteModal);
}

// Event listenery
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, initializing app");
    
    // Načtení dat a aktualizace statistik
    loadData();
    updateStats();
    
    // Inicializace Firebase
    try {
        initFirebase();
        
        const loginBtn = document.getElementById('google-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                signInWithGoogle();
            });
        }
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', signOut);
        }
    } catch (error) {
        console.error("Chyba při inicializaci Firebase:", error);
    }
    
    // Event listener pro ikonu složky
    const slepiceFolder = document.getElementById('slepice-folder');
    if (slepiceFolder) {
        slepiceFolder.addEventListener('click', showDetailView);
    }
    
    // Event listener pro tlačítko zpět
    const backToMainBtn = document.getElementById('back-to-main');
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', showMainView);
    }
    
    // Inicializace datumu úmrtí pro zobrazení/skrytí stáří při úmrtí
    if (datumUmrtiInput) {
        datumUmrtiInput.addEventListener('input', function() {
            document.getElementById('stariPriUmrti-group').style.display = this.value ? 'block' : 'none';
            calculateStariPriUmrti();
        });
    }
    
    // Inicializace kontroly druhu při změně
    if (druhInput) {
        druhInput.addEventListener('input', checkBreedRestriction);
    }
    
    if (datumZakoupeniInput) {
        datumZakoupeniInput.addEventListener('change', () => {
            checkBreedRestriction();
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
    
    // Inicializace přepínače typu kroužku
    document.querySelectorAll('input[name="typ-krouzku"]').forEach(radio => {
        radio.addEventListener('change', toggleKrouzekTyp);
    });
    
    // Inicializace hromadného přidání
    if (hromadnePridaniCheck) {
        hromadnePridaniCheck.addEventListener('change', toggleHromadnePridani);
    }
    
    // Naplnění dropdown čísel kroužků
    populateCislaKrouzku();
    
    // Aktualizace seznamu druhů
    updateDruhyDatalist();
    
    // Vyhledávání
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            const filteredSlepice = searchSlepice(query);
            const filteredGroups = groupSlepiceByDate(filteredSlepice);
            renderSlepiceGroups(filteredGroups);
        });
    }
    
    // Přidání slepice
    if (addSlepiceBtn) {
        addSlepiceBtn.addEventListener('click', () => openAddModal());
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
    
    // Modální okno pro editaci skupiny
    const groupEditModalClose = document.getElementById('group-edit-modal-close');
    if (groupEditModalClose) {
        groupEditModalClose.addEventListener('click', () => closeModal(document.getElementById('group-edit-modal')));
    }
    
    const groupEditCancel = document.getElementById('group-edit-cancel');
    if (groupEditCancel) {
        groupEditCancel.addEventListener('click', () => closeModal(document.getElementById('group-edit-modal')));
    }
    
    const groupEditSave = document.getElementById('group-edit-save');
    if (groupEditSave) {
        groupEditSave.addEventListener('click', saveGroupEdit);
    }
    
    // Modální okno pro smazání skupiny
    const deleteGroupModalClose = document.getElementById('delete-group-modal-close');
    if (deleteGroupModalClose) {
        deleteGroupModalClose.addEventListener('click', () => closeModal(document.getElementById('delete-group-modal')));
    }
    
    const deleteGroupCancel = document.getElementById('delete-group-cancel');
    if (deleteGroupCancel) {
        deleteGroupCancel.addEventListener('click', () => closeModal(document.getElementById('delete-group-modal')));
    }
    
    const deleteGroupConfirm = document.getElementById('delete-group-confirm');
    if (deleteGroupConfirm) {
        deleteGroupConfirm.addEventListener('click', function() {
            const date = this.dataset.date;
            deleteGroup(date);
        });
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
        } else if (e.target.id === 'group-edit-modal') {
            closeModal(document.getElementById('group-edit-modal'));
        } else if (e.target.id === 'delete-group-modal') {
            closeModal(document.getElementById('delete-group-modal'));
        }
    });
    
    console.log("App initialization completed");
});
        // Globální proměnné pro Firebase
let auth, db, currentUser;

// Inicializace Firebase reference
function initFirebase() {
    try {
        console.log("Inicializace Firebase referencí...");
        if (typeof firebase !== 'undefined' && firebase.app) {
            auth = firebase.auth();
            db = firebase.firestore();
            
            // Kontrola stavu přihlášení při inicializaci
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log("Uživatel přihlášen:", user.displayName);
                    currentUser = user;
                    document.getElementById('login-status').textContent = `Přihlášen jako: ${user.displayName}`;
                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('logout-section').style.display = 'flex';
                    
                    // Načtení dat uživatele
                    loadUserData();
                } else {
                    console.log("Žádný přihlášený uživatel");
                    currentUser = null;
                    document.getElementById('login-section').style.display = 'flex';
                    document.getElementById('logout-section').style.display = 'none';
                    
                    // Načtení lokálních dat
                    loadData();
                    updateStats();
                }
            });
            
            if (document.getElementById('firebase-status')) {
                document.getElementById('firebase-status').style.display = 'none';
            }
            
            return true;
        } else {
            throw new Error("Firebase není dostupný");
        }
    } catch (error) {
        console.error("Chyba při inicializaci Firebase:", error);
        if (document.getElementById('firebase-status')) {
            document.getElementById('firebase-status').style.display = 'block';
        }
        return false;
    }
}

// Přihlášení pomocí Google účtu
function signInWithGoogle() {
    try {
        console.log("Pokus o přihlášení pomocí Google...");
        if (!auth) {
            console.error("Firebase Auth není inicializován!");
            alert("Nepodařilo se inicializovat Firebase Auth. Zkuste obnovit stránku.");
            return;
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                console.log("Přihlášení úspěšné:", result.user.displayName);
            })
            .catch((error) => {
                console.error("Chyba při přihlašování:", error);
                alert("Nepodařilo se přihlásit: " + error.message);
            });
    } catch (error) {
        console.error("Chyba při pokusu o přihlášení:", error);
        alert("Nastala chyba při přihlašování: " + error.message);
    }
}

// Odhlášení
function signOut() {
    if (!auth) return;
    
    auth.signOut()
        .then(() => {
            console.log("Odhlášení úspěšné");
        })
        .catch((error) => {
            console.error("Chyba při odhlašování:", error);
            alert("Chyba při odhlašování: " + error.message);
        });
}

// Načtení dat uživatele z Firebase
function loadUserData() {
    if (!currentUser || !db) {
        console.error("Nelze načíst data - uživatel nebo databáze nejsou k dispozici");
        return;
    }
    
    console.log("Načítání dat z Firestore pro uživatele:", currentUser.uid);
    db.collection('users').doc(currentUser.uid).collection('slepice').get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                console.log("Nalezena data v Firestore, počet záznamů:", querySnapshot.size);
                const userData = [];
                querySnapshot.forEach((doc) => {
                    userData.push(doc.data());
                });
                
                slepice = userData;
                
                // Aktualizace statistik
                updateStats();
                
                // Uložení do localStorage jako záloha
                localStorage.setItem('slepice-data', JSON.stringify(slepice));
            } else {
                console.log("Žádná data v Firestore, použijeme lokální data");
                loadData();
                if (slepice.length > 0) {
                    saveUserData();
                }
                updateStats();
            }
        })
        .catch((error) => {
            console.error("Chyba při načítání dat z Firestore:", error);
            loadData();
            updateStats();
        });
}

// Uložení dat uživatele do Firebase
function saveUserData() {
    if (!currentUser || !db) {
        console.error("Nelze uložit data - uživatel nebo databáze nejsou k dispozici");
        return;
    }
    
    console.log("Ukládání dat do Firestore pro uživatele:", currentUser.uid);
    
    db.collection('users').doc(currentUser.uid).collection('slepice').get()
        .then((querySnapshot) => {
            const firestoreIds = [];
            querySnapshot.forEach(doc => {
                firestoreIds.push(doc.id);
            });
            
            const currentIds = slepice.map(s => s.id.toString());
            const idsToDelete = firestoreIds.filter(id => !currentIds.includes(id));
            
            const deletePromises = idsToDelete.map(id => {
                console.log(`Odstraňuji záznam s ID ${id} z Firestore`);
                return db.collection('users').doc(currentUser.uid).collection('slepice').doc(id).delete();
            });
            
            const savePromises = slepice.map(s => {
                return db.collection('users').doc(currentUser.uid).collection('slepice').doc(s.id.toString())
                    .set(s)
                    .then(() => {
                        console.log(`Slepice ID ${s.id} úspěšně uložena`);
                    })
                    .catch(error => {
                        console.error(`Chyba při ukládání slepice ID ${s.id}:`, error);
                    });
            });
            
            return Promise.all([...deletePromises, ...savePromises]);
        })
        .then(() => {
            console.log("Všechna data úspěšně aktualizována v Firestore");
        })
        .catch((error) => {
            console.error("Chyba při aktualizaci dat v Firestore:", error);
        });
}

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
        stranaKrouzku: "", 
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
        stranaKrouzku: "", 
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
        stranaKrouzku: "", 
        porizovaci_cena: 320 
    }
];

// Načtení dat z localStorage při startu
function loadData() {
    const savedData = localStorage.getItem('slepice-data');
    if (savedData) {
        try {
            slepice = JSON.parse(savedData);
            console.log("Data načtena z localStorage, počet záznamů:", slepice.length);
        } catch (e) {
            console.error('Chyba při načítání dat z localStorage:', e);
        }
    } else {
        console.log("Žádná data v localStorage, použijeme výchozí data");
    }
}

// Uložení dat do localStorage
function saveData() {
    localStorage.setItem('slepice-data', JSON.stringify(slepice));
    console.log("Data uložena do localStorage, počet záznamů:", slepice.length);
    
    if (currentUser) {
        saveUserData();
    }
}

// Přepínání mezi hlavním a detailním pohledem
function showMainView() {
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('detail-view').style.display = 'none';
}

function showDetailView() {
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    
    // Načtení a zobrazení dat
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
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
const originalDruhInput = document.getElementById('originalDruh');
const druhInput = document.getElementById('druh');
const datumZakoupeniInput = document.getElementById('datumZakoupeni');
const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
const datumUmrtiInput = document.getElementById('datumUmrti');
const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
const barvaKrouzkuInput = document.getElementById('barvaKrouzku');
const cisloKrouzkuInput = document.getElementById('cisloKrouzku');
const stranaKrouzkuInput = document.getElementById('strana-krouzku');
const porizovaci_cenaInput = document.getElementById('porizovaci_cena');
const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
const pocetSlepicInput = document.getElementById('pocet-slepic');
const hromadnePridaniContainer = document.getElementById('hromadne-pridani-container');
const druhyDatalist = document.getElementById('druhy-datalist');
const breedRestrictionError = document.getElementById('breed-restriction-error');

const deleteModal = document.getElementById('delete-modal');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');
const deleteSlepiceName = document.getElementById('delete-slepice-name');

const statTotal = document.getElementById('stat-total');
const statInvestment = document.getElementById('stat-investment');
const statHistorical = document.getElementById('stat-historical');

// Funkce pro výpočet a formátování aktuálního stáří skupiny slepic
function calculateGroupAge(purchaseDate, initialAgeWeeks) {
    if (!purchaseDate) return "-";
    
    const today = new Date();
    const zakoupeni = new Date(purchaseDate);
    
    const rozdilDny = Math.floor((today - zakoupeni) / (1000 * 60 * 60 * 24));
    const rozdilTydny = Math.floor(rozdilDny / 7);
    
    const celkoveTydny = rozdilTydny + initialAgeWeeks;
    
    return formatAge(celkoveTydny);
}

// Funkce pro formátování věku
function formatAge(weeks) {
    if (!weeks || isNaN(weeks)) return "-";
    
    if (weeks < 26) {
        return `${weeks} týdnů`;
    }
    else if (weeks < 52) {
        const months = Math.floor(weeks / 4.33);
        return `${months} měsíců`;
    }
    else {
        const years = Math.floor(weeks / 52);
        const months = Math.floor((weeks % 52) / 4.33);
        if (months === 0) {
            return years === 1 ? `1 rok` : `${years} roky`;
        } else {
            return years === 1 
                ? `1 rok ${months} měsíců` 
                : `${years} roky ${months} měsíců`;
        }
    }
}

// Funkce pro seskupení slepic podle data zakoupení
function groupSlepiceByDate(slepiceList) {
    const groups = {};
    
    slepiceList.forEach(slepice => {
        if (!groups[slepice.datumZakoupeni]) {
            groups[slepice.datumZakoupeni] = [];
        }
        groups[slepice.datumZakoupeni].push(slepice);
    });
    
    return Object.keys(groups).map(datum => {
        const slepiceGroup = groups[datum];
        const zive = slepiceGroup.filter(s => !s.datumUmrti).length;
        const celkovaCena = slepiceGroup.reduce((sum, s) => sum + (parseInt(s.porizovaci_cena) || 0), 0);
        
        const druhy = [...new Set(slepiceGroup.map(s => s.druh))];
        const barvy = [...new Set(slepiceGroup.map(s => s.barvaKrouzku).filter(b => b))];
        
        const cislaKrouzku = slepiceGroup
            .map(s => s.cisloKrouzku)
            .filter(c => c && !isNaN(parseInt(c)))
            .map(c => parseInt(c))
            .sort((a, b) => a - b);
        
        let rozsahCisel = "";
        if (cislaKrouzku.length > 0) {
            const min = cislaKrouzku[0];
            const max = cislaKrouzku[cislaKrouzku.length - 1];
            rozsahCisel = min === max ? min.toString() : `${min}-${max}`;
        }
        
        const strany = slepiceGroup
            .map(s => s.stranaKrouzku)
            .filter(s => s)
            .reduce((acc, strana) => {
                acc[strana] = (acc[strana] || 0) + 1;
                return acc;
            }, {});
        
        let stranyText = "";
        if (Object.keys(strany).length > 0) {
            stranyText = Object.entries(strany)
                .map(([strana, pocet]) => `${strana} (${pocet})`)
                .join(", ");
        }
        
        let statusClass = 'group-status-healthy';
        if (zive === 0) {
            statusClass = 'group-status-danger';
        } else if (zive / slepiceGroup.length < 0.5) {
            statusClass = 'group-status-warning';
        }
        
        // Výpočet průměrného stáří při zakoupení
        const averageInitialAge = slepiceGroup.reduce((sum, s) => sum + (parseInt(s.stariPriZakoupeni) || 0), 0) / slepiceGroup.length;
        
        return {
            datum: datum,
            slepice: slepiceGroup,
            pocet: slepiceGroup.length,
            zive: zive,
            celkovaCena: celkovaCena,
            druhy: druhy.join(", "),
            barvy: barvy,
            rozsahCisel: rozsahCisel,
            strany: stranyText,
            statusClass: statusClass,
            averageInitialAge: averageInitialAge
        };
    }).sort((a, b) => new Date(b.datum) - new Date(a.datum));
}

// Funkce pro získání CSS třídy pro barvu kroužku
function getRingColorClass(barva) {
    if (!barva) return 'ring-none';
    
    switch (barva.toLowerCase()) {
        case 'červená': return 'ring-red';
        case 'zelená': return 'ring-green';
        case 'žlutá': return 'ring-yellow';
        case 'modrá': return 'ring-blue';
        default: return 'ring-none';
    }
}

// Funkce pro zobrazení skupin na hlavní stránce
function renderSlepiceGroups(groups) {
    slepiceTableBody.innerHTML = '';
    
    if (groups.length === 0) {
        slepiceTableBody.innerHTML = `
            <tr>
                <td colspan="8">
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
    
    groups.forEach(group => {
        const row = document.createElement('tr');
        row.classList.add('group-row');
        row.dataset.date = group.datum;
        
        let barvyHTML = "";
        if (group.barvy && group.barvy.length > 0) {
            barvyHTML = group.barvy.map(barva => {
                const colorClass = getRingColorClass(barva);
                return `
                    <div class="ring-color-container">
                        <span class="ring-color ${colorClass}"></span>
                        <span class="ring-color-text">${barva}</span>
                    </div>
                `;
            }).join('');
        } else {
            barvyHTML = '<span class="text-secondary">-</span>';
        }
        
        const statusHTML = `
            <div class="group-status ${group.statusClass}">
                ${group.zive} z ${group.pocet}
            </div>
        `;
        
        const currentAge = calculateGroupAge(group.datum, group.averageInitialAge);
        
        row.innerHTML = `
            <td>
                <div class="group-header">
                    <button class="btn-toggle">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    ${group.druhy}
                </div>
            </td>
            <td>${formatDate(group.datum)}</td>
            <td>
                <div class="age-display">
                    <span class="age-value">${currentAge}</span>
                </div>
            </td>
            <td>
                ${group.pocet} ${statusHTML}
            </td>
            <td>${group.celkovaCena} Kč</td>
            <td>${barvyHTML}</td>
            <td>${group.rozsahCisel || group.strany || "-"}</td>
            <td class="actions">
                <button class="icon-btn add-to-group-btn" data-date="${group.datum}" data-druh="${group.druhy}" title="Přidat do skupiny">
                    <i class="fas fa-plus-circle"></i>
                </button>
                <button class="icon-btn edit-group-btn" data-date="${group.datum}" title="Upravit skupinu">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete-group-btn" data-date="${group.datum}" title="Smazat skupinu">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        slepiceTableBody.appendChild(row);
        
        const detailRow = document.createElement('tr');
        detailRow.classList.add('detail-row');
        detailRow.style.display = 'none';
        
        const detailCell = document.createElement('td');
        detailCell.colSpan = 8;
        detailCell.innerHTML = `
            <div class="detail-container">
                <table class="detail-table">
                    <thead>
                        <tr>
                            <th>Druh</th>
                            <th>Stáří při zakoupení</th>
                            <th>Stav</th>
                            <th>Kroužek</th>
                            <th>Cena</th>
                            <th>Akce</th>
                        </tr>
                    </thead>
                    <tbody class="detail-table-body" data-date="${group.datum}">
                    </tbody>
                </table>
            </div>
        `;
        
        detailRow.appendChild(detailCell);
        slepiceTableBody.appendChild(detailRow);
    });
    
    // Event listener pro rozbalení/sbalení skupiny
    document.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
            const groupRow = this.closest('.group-row');
            const detailRow = groupRow.nextElementSibling;
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-chevron-right');
            icon.classList.toggle('fa-chevron-down');
            
            if (detailRow.style.display === 'none') {
                detailRow.style.display = 'table-row';
                renderGroupDetails(groupRow.dataset.date);
            } else {
                detailRow.style.display = 'none';
            }
        });
    });
    
    // Event listenery pro tlačítka skupin
    document.querySelectorAll('.add-to-group-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            const druh = this.dataset.druh;
            openAddModal(date, druh);
        });
    });
    
    document.querySelectorAll('.edit-group-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openGroupEditModal(date);
        });
    });
    
    document.querySelectorAll('.delete-group-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openDeleteGroupModal(date);
        });
    });
}
