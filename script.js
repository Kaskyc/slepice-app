// Firebase reference
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// Přihlášení pomocí Google účtu
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // Úspěšné přihlášení
            currentUser = result.user;
            document.getElementById('login-status').textContent = `Přihlášen jako: ${currentUser.displayName}`;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('logout-section').style.display = 'flex';
            
            // Načtení dat uživatele
            loadUserData();
        })
        .catch((error) => {
            console.error("Chyba při přihlašování: ", error);
            alert("Nepodařilo se přihlásit. Zkuste to prosím znovu.");
        });
}

// Odhlášení
function signOut() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            document.getElementById('login-section').style.display = 'flex';
            document.getElementById('logout-section').style.display = 'none';
            
            // Načtení lokálních dat
            loadData();
            const groups = groupSlepiceByDate(slepice);
            renderSlepiceGroups(groups);
            updateStats();
        })
        .catch((error) => {
            console.error("Chyba při odhlašování: ", error);
        });
}

// Načtení dat uživatele z Firebase
function loadUserData() {
    if (!currentUser) return;
    
    db.collection('users').doc(currentUser.uid).collection('slepice').get()
        .then((querySnapshot) => {
            if (!querySnapshot.empty) {
                const userData = [];
                querySnapshot.forEach((doc) => {
                    userData.push(doc.data());
                });
                
                slepice = userData;
                
                // Zobrazení dat
                const groups = groupSlepiceByDate(slepice);
                renderSlepiceGroups(groups);
                updateStats();
                
                // Uložení do localStorage jako záloha
                localStorage.setItem('slepice-data', JSON.stringify(slepice));
            } else {
                // Pokud uživatel nemá data v cloudu, použijeme lokální, pokud existují
                loadData();
                if (slepice.length > 0) {
                    // Uložíme lokální data do cloudu
                    saveUserData();
                }
                
                const groups = groupSlepiceByDate(slepice);
                renderSlepiceGroups(groups);
                updateStats();
            }
        })
        .catch((error) => {
            console.error("Chyba při načítání dat: ", error);
            // Záložní načtení z localStorage
            loadData();
            const groups = groupSlepiceByDate(slepice);
            renderSlepiceGroups(groups);
            updateStats();
        });
}

// Uložení dat uživatele do Firebase
function saveUserData() {
    if (!currentUser) return;
    
    // Nejprve smažeme existující kolekci
    const batch = db.batch();
    
    db.collection('users').doc(currentUser.uid).collection('slepice').get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            return batch.commit();
        })
        .then(() => {
            // Nyní přidáme nová data
            const promises = slepice.map(s => {
                return db.collection('users').doc(currentUser.uid).collection('slepice').doc(s.id.toString()).set(s);
            });
            
            return Promise.all(promises);
        })
        .then(() => {
            console.log("Data úspěšně uložena do cloudu");
        })
        .catch((error) => {
            console.error("Chyba při ukládání dat: ", error);
        });
    
    // Záložní uložení do localStorage
    localStorage.setItem('slepice-data', JSON.stringify(slepice));
}

// Úprava funkce saveData
function saveData() {
    // Uložení do localStorage
    localStorage.setItem('slepice-data', JSON.stringify(slepice));
    
    // Pokud je uživatel přihlášen, uložíme data i do cloudu
    if (currentUser) {
        saveUserData();
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
    
    // Převod objektu skupin na pole pro snazší práci
    return Object.keys(groups).map(datum => {
        const slepiceGroup = groups[datum];
        const zive = slepiceGroup.filter(s => !s.datumUmrti).length;
        const celkovaCena = slepiceGroup.reduce((sum, s) => sum + (parseInt(s.porizovaci_cena) || 0), 0);
        
        // Zjištění druhů slepic ve skupině
        const druhy = [...new Set(slepiceGroup.map(s => s.druh))];
        
        // Zjištění barvy kroužků
        const barvy = [...new Set(slepiceGroup.map(s => s.barvaKrouzku).filter(b => b))];
        
        // Zjištění rozsahu čísel kroužků (pouze pro slepice s číselným kroužkem)
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
        
        // Zjištění stran kroužků
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
        
        return {
            datum: datum,
            slepice: slepiceGroup,
            pocet: slepiceGroup.length,
            zive: zive,
            celkovaCena: celkovaCena,
            druhy: druhy.join(", "),
            barvy: barvy.join(", "),
            rozsahCisel: rozsahCisel,
            strany: stranyText
        };
    }).sort((a, b) => new Date(b.datum) - new Date(a.datum)); // Seřazení od nejnovějších
}

document.addEventListener('DOMContentLoaded', () => {
    // ... (existující kód)
    
    // Přihlášení pomocí Google
    document.getElementById('google-login-btn').addEventListener('click', signInWithGoogle);
    
    // Odhlášení
    document.getElementById('logout-btn').addEventListener('click', signOut);
    
    // Kontrola stavu přihlášení při načtení stránky
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Uživatel je přihlášen
            currentUser = user;
            document.getElementById('login-status').textContent = `Přihlášen jako: ${user.displayName}`;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('logout-section').style.display = 'flex';
            
            // Načtení dat uživatele
            loadUserData();
        } else {
            // Uživatel je odhlášen
            currentUser = null;
            document.getElementById('login-section').style.display = 'flex';
            document.getElementById('logout-section').style.display = 'none';
            
            // Načtení lokálních dat
            loadData();
            const groups = groupSlepiceByDate(slepice);
            renderSlepiceGroups(groups);
            updateStats();
        }
    });
    
    // ... (zbytek existujícího kódu)
});

// Funkce pro zobrazení skupin na hlavní stránce
function renderSlepiceGroups(groups) {
    slepiceTableBody.innerHTML = '';
    
    if (groups.length === 0) {
        slepiceTableBody.innerHTML = `
            <tr>
                <td colspan="7">
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
            <td>${group.pocet} (${group.zive} žijících)</td>
            <td>${group.celkovaCena} Kč</td>
            <td>${group.barvy || "-"}</td>
            <td>${group.rozsahCisel || group.strany || "-"}</td>
            <td class="actions">
                <button class="icon-btn add-to-group-btn" data-date="${group.datum}" title="Přidat do skupiny">
                    <i class="fas fa-plus-circle"></i>
                </button>
            </td>
        `;
        
        slepiceTableBody.appendChild(row);
        
        // Vytvoříme kontejner pro detail skupiny (bude skrytý)
        const detailRow = document.createElement('tr');
        detailRow.classList.add('detail-row');
        detailRow.style.display = 'none';
        
        const detailCell = document.createElement('td');
        detailCell.colSpan = 7;
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
            
            // Přepnutí ikony šipky
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-chevron-right');
            icon.classList.toggle('fa-chevron-down');
            
            // Zobrazení/skrytí detailu
            if (detailRow.style.display === 'none') {
                detailRow.style.display = 'table-row';
                // Načtení detailů pro tuto skupinu
                renderGroupDetails(groupRow.dataset.date);
            } else {
                detailRow.style.display = 'none';
            }
        });
    });
    
    // Event listener pro přidání slepice do skupiny
    document.querySelectorAll('.add-to-group-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Zastavení propagace události, aby se nerozbalil detail
            const date = this.dataset.date;
            openAddModal(date);
        });
    });
}

// Funkce pro zobrazení detailů skupiny
function renderGroupDetails(date) {
    const detailTableBody = document.querySelector(`.detail-table-body[data-date="${date}"]`);
    if (!detailTableBody) return;
    
    // Filtrujeme slepice podle data zakoupení
    const groupSlepice = slepice.filter(s => s.datumZakoupeni === date);
    
    detailTableBody.innerHTML = '';
    
    groupSlepice.forEach(slepice => {
        const row = document.createElement('tr');
        
        // Určení typu kroužku
        let krouzekInfo = "-";
        if (slepice.cisloKrouzku) {
            const barva = slepice.barvaKrouzku || '';
            const colorStyle = barva ? `<span class="color-badge" style="background-color: ${getColorCode(barva)}"></span>` : '';
            krouzekInfo = `${colorStyle}č. ${slepice.cisloKrouzku}`;
        } else if (slepice.stranaKrouzku) {
            const barva = slepice.barvaKrouzku || '';
            const colorStyle = barva ? `<span class="color-badge" style="background-color: ${getColorCode(barva)}"></span>` : '';
            krouzekInfo = `${colorStyle}${slepice.stranaKrouzku} strana`;
        }
        
        // Status
        const statusHtml = slepice.datumUmrti 
            ? `<span class="status status-deceased">Zemřela</span>` 
            : `<span class="status status-active">Žije</span>`;
        
        row.innerHTML = `
            <td>${slepice.druh}</td>
            <td>${slepice.stariPriZakoupeni} týdnů</td>
            <td>
                ${slepice.datumUmrti 
                    ? `${formatDate(slepice.datumUmrti)}<div style="font-size: 0.8rem; color: #666;">${slepice.stariPriUmrti} týdnů</div>` 
                    : statusHtml
                }
            </td>
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
    
    // Nastavení event listenerů pro tlačítka
    detailTableBody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    
    detailTableBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
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

// Přepínání mezi číslem kroužku a stranou
function toggleKrouzekTyp() {
    const typCislo = document.getElementById('typ-krouzku-cislo').checked;
    const typStrana = document.getElementById('typ-krouzku-strana').checked;
    
    document.getElementById('cislo-krouzku-group').style.display = typCislo ? 'block' : 'none';
    document.getElementById('strana-krouzku-group').style.display = typStrana ? 'block' : 'none';
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

// Otevření modálního okna pro přidání s předvyplněným datem
function openAddModal(predvyplnenyDatum = null) {
    modalTitle.textContent = 'Přidat novou slepici';
    slepiceForm.reset();
    slepiceIdInput.value = '';
    
    // Přepnutí na výchozí typ kroužku (číslo)
    document.getElementById('typ-krouzku-cislo').checked = true;
    toggleKrouzekTyp();
    
    // Nastavit dnešní datum jako výchozí pro datum zakoupení
    if (predvyplnenyDatum) {
        datumZakoupeniInput.value = predvyplnenyDatum;
    } else {
        const today = new Date().toISOString().split('T')[0];
        datumZakoupeniInput.value = today;
    }
    
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
    
    // Nastavení typu kroužku
    if (slepiceToEdit.stranaKrouzku) {
        document.getElementById('typ-krouzku-strana').checked = true;
        document.getElementById('strana-krouzku').value = slepiceToEdit.stranaKrouzku;
        toggleKrouzekTyp();
    } else {
        document.getElementById('typ-krouzku-cislo').checked = true;
        toggleKrouzekTyp();
        
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
    
    const typCislo = document.getElementById('typ-krouzku-cislo').checked;
    
    const baseSlepice = {
        druh: druhInput.value,
        datumZakoupeni: datumZakoupeniInput.value,
        stariPriZakoupeni: parseInt(stariPriZakoupeniInput.value),
        datumUmrti: datumUmrtiInput.value || '',
        stariPriUmrti: stariPriUmrtiInput.value ? parseInt(stariPriUmrtiInput.value) : null,
        barvaKrouzku: barvaKrouzkuInput.value,
        porizovaci_cena: porizovaci_cenaInput.value ? parseInt(porizovaci_cenaInput.value) : null,
        cisloKrouzku: typCislo ? cisloKrouzkuInput.value : '',
        stranaKrouzku: !typCislo ? document.getElementById('strana-krouzku').value : ''
    };
    
    if (isEditing) {
        // Aktualizace existující slepice
        const updatedSlepice = {
            id: parseInt(slepiceId),
            ...baseSlepice
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
            
            if (typCislo) {
                // Hromadné přidání s čísly kroužků
                let baseKrouzek = parseInt(cisloKrouzkuInput.value);
                if (isNaN(baseKrouzek)) {
                    baseKrouzek = 1; // Výchozí hodnota, pokud není zadáno číselné číslo kroužku
                }
                
                // Vytvoření zadaného počtu slepic
                for (let i = 0; i < pocet; i++) {
                    const novaSlepice = {
                        id: startId + i,
                        ...baseSlepice,
                        cisloKrouzku: (baseKrouzek + i).toString(),
                        stranaKrouzku: ''
                    };
                    
                    slepice.push(novaSlepice);
                }
            } else {
                // Upozornění, že hromadné přidání není možné se stranou kroužku
                alert('Hromadné přidání není možné při výběru strany kroužku. Prosím, použijte číslo kroužku pro hromadné přidání.');
                return;
            }
        } else {
            // Přidání jedné slepice
            const novaSlepice = {
                id: slepice.length > 0 ? Math.max(...slepice.map(s => s.id)) + 1 : 1,
                ...baseSlepice
            };
            
            slepice.push(novaSlepice);
        }
    }
    
    // Uložení dat
    saveData();
    
    // Aktualizace zobrazení
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
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
        
        // Aktualizace zobrazení skupin místo tabulky
        const groups = groupSlepiceByDate(slepice);
        renderSlepiceGroups(groups);
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
    
    // Seskupení a zobrazení dat
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
    updateStats();
    
    // Vyhledávání
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            // Hledání nyní provádíme trochu jinak - nejprve filtrujeme slepice,
            // pak je seskupujeme podle datumu
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
   
  // Uložení formuláře
    if (modalSave) {
        modalSave.addEventListener('click', saveForm);
    }
    
    // Potvrzení odstranění
    if (deleteConfirm) {
        deleteConfirm.addEventListener('click', () => {
            const id = parseInt(deleteConfirm.dataset.id);
            deleteSlepice(id);
            
            // Po smazání aktualizujeme zobrazení skupin
            const groups = groupSlepiceByDate(slepice);
            renderSlepiceGroups(groups);
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
                
