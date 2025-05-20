// Globální proměnné pro Firebase
let auth, db, currentUser;

// Globální proměnná pro data
let slepice = [];

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
                    updateUI();
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
                // onAuthStateChanged se postará o aktualizaci UI
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
            // onAuthStateChanged se postará o aktualizaci UI
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
                
                // Uložení do localStorage jako záloha
                localStorage.setItem('slepice-data', JSON.stringify(slepice));
                
                // Aktualizace UI
                updateUI();
            } else {
                console.log("Žádná data v Firestore, použijeme lokální data");
                // Pokud uživatel nemá data v cloudu, použijeme lokální, pokud existují
                loadData();
                if (slepice.length > 0) {
                    // Uložíme lokální data do cloudu
                    saveUserData();
                }
                
                updateUI();
            }
        })
        .catch((error) => {
            console.error("Chyba při načítání dat z Firestore:", error);
            // Záložní načtení z localStorage
            loadData();
            updateUI();
        });
}

// Uložení dat uživatele do Firebase
function saveUserData() {
    if (!currentUser || !db) {
        console.error("Nelze uložit data - uživatel nebo databáze nejsou k dispozici");
        return;
    }
    
    console.log("Ukládání dat do Firestore pro uživatele:", currentUser.uid);
    
    // Přístup po jednotlivých dokumentech pro větší spolehlivost
    const promises = slepice.map(s => {
        return db.collection('users').doc(currentUser.uid).collection('slepice').doc(s.id.toString())
            .set(s)
            .then(() => {
                console.log(`Slepice ID ${s.id} úspěšně uložena`);
            })
            .catch(error => {
                console.error(`Chyba při ukládání slepice ID ${s.id}:`, error);
            });
    });
    
    Promise.all(promises)
        .then(() => {
            console.log("Všechna data úspěšně uložena do Firestore");
        })
        .catch((error) => {
            console.error("Chyba při ukládání dat do Firestore:", error);
        });
}

// Načtení dat z localStorage při startu
function loadData() {
    const savedData = localStorage.getItem('slepice-data');
    if (savedData) {
        try {
            slepice = JSON.parse(savedData);
            console.log("Data načtena z localStorage, počet záznamů:", slepice.length);
        } catch (e) {
            console.error('Chyba při načítání dat z localStorage:', e);
            // Pokud dojde k chybě, použijeme výchozí data
            initDefaultData();
        }
    } else {
        console.log("Žádná data v localStorage, použijeme výchozí data");
        initDefaultData();
    }
}

// Inicializace výchozích dat
function initDefaultData() {
    slepice = [
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
}

// Uložení dat do localStorage
function saveData() {
    // Uložení do localStorage
    localStorage.setItem('slepice-data', JSON.stringify(slepice));
    console.log("Data uložena do localStorage, počet záznamů:", slepice.length);
    
    // Pokud je uživatel přihlášen, uložíme data i do cloudu
    if (currentUser) {
        saveUserData();
    }
}

// Aktualizace celého UI
function updateUI() {
    // Aktualizace pohledu složek
    updateFolderView();
    
    // Aktualizace detailního pohledu
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
    
    // Aktualizace statistik
    updateStats();
}

// Aktualizace statistik na hlavní stránce (v složce)
function updateFolderView() {
    const activeSlepice = slepice.filter(s => !s.datumUmrti);
    const historicalSlepice = slepice.filter(s => s.datumUmrti);
    
    document.getElementById('stat-live-folder').textContent = activeSlepice.length;
    document.getElementById('stat-dead-folder').textContent = historicalSlepice.length;
}

// Aktualizace statistik v detailním pohledu
function updateStats() {
    const activeSlepice = slepice.filter(s => !s.datumUmrti);
    const historicalSlepice = slepice.filter(s => s.datumUmrti);
    const totalInvestment = slepice.reduce((sum, s) => sum + (parseInt(s.porizovaci_cena) || 0), 0);
    
    document.getElementById('stat-total').textContent = activeSlepice.length;
    document.getElementById('stat-investment').textContent = `${totalInvestment.toLocaleString()} Kč`;
    document.getElementById('stat-historical').textContent = historicalSlepice.length;
}

// Formátování data
function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
}

// Formátování stáří v týdnech/měsících/letech
function formatAge(weeks) {
    if (!weeks) return "-";
    
    weeks = parseInt(weeks);
    
    if (weeks < 26) {
        // Méně než 6 měsíců - zobrazit v týdnech
        return `${weeks} týdnů`;
    } else if (weeks < 52) {
        // 6-12 měsíců - zobrazit v měsících
        const months = Math.floor(weeks / 4.33);
        return `${months} měsíců`;
    } else {
        // Více než rok - zobrazit v letech a měsících
        const years = Math.floor(weeks / 52);
        const remainingWeeks = weeks % 52;
        const months = Math.floor(remainingWeeks / 4.33);
        
        if (months === 0) {
            return years === 1 ? `1 rok` : `${years} let`;
        } else {
            return years === 1 
                ? `1 rok ${months} ${getMonthWord(months)}` 
                : `${years} let ${months} ${getMonthWord(months)}`;
        }
    }
}

// Pomocná funkce pro skloňování slova "měsíc"
function getMonthWord(months) {
    if (months === 1) return "měsíc";
    if (months >= 2 && months <= 4) return "měsíce";
    return "měsíců";
}

// Výpočet aktuálního stáří slepice (pro živé slepice)
function calculateCurrentAge(slepice) {
    const datumZakoupeni = new Date(slepice.datumZakoupeni);
    const stariPriZakoupeni = parseInt(slepice.stariPriZakoupeni);
    
    // Výpočet rozdílu v týdnech mezi datem zakoupení a dnešním datem
    const today = new Date();
    const rozdilDny = Math.floor((today - datumZakoupeni) / (1000 * 60 * 60 * 24));
    const rozdilTydny = Math.floor(rozdilDny / 7);
    
    // Aktuální stáří = stáří při zakoupení + počet týdnů od zakoupení
    return stariPriZakoupeni + rozdilTydny;
}

// Získání statusu skupiny podle poměru živých slepic
function getGroupStatusClass(zive, total) {
    // Zjistíme poměr živých slepic
    const ratio = zive / total;
    
    if (ratio === 1) {
        return "tag-green"; // Všechny žijí
    } else if (ratio >= 0.5) {
        return "tag-yellow"; // 50% a více žije
    } else {
        return "tag-red"; // Méně než 50% žije
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
        
        // Výpočet průměrného stáří slepic ve skupině
        const prumerneStari = slepiceGroup.reduce((sum, s) => {
            // Pro zemřelé slepice použijeme stáří při úmrtí
            if (s.datumUmrti && s.stariPriUmrti) {
                return sum + parseInt(s.stariPriUmrti);
            } 
            // Pro živé slepice vypočítáme aktuální stáří
            else {
                return sum + calculateCurrentAge(s);
            }
        }, 0) / slepiceGroup.length;
        
        return {
            datum: datum,
            slepice: slepiceGroup,
            pocet: slepiceGroup.length,
            zive: zive,
            celkovaCena: celkovaCena,
            druhy: druhy.join(", "),
            barvy: barvy.join(", "),
            rozsahCisel: rozsahCisel,
            strany: stranyText,
            prumerneStari: Math.round(prumerneStari)
        };
    }).sort((a, b) => new Date(b.datum) - new Date(a.datum)); // Seřazení od nejnovějších
}

// Funkce pro zobrazení skupin na hlavní stránce
function renderSlepiceGroups(groups) {
    const slepiceTableBody = document.getElementById('slepice-table-body');
    slepiceTableBody.innerHTML = '';
    
    if (groups.length === 0) {
        slepiceTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <svg class="chicken-icon" viewBox="0 0 600 800" fill="none" style="width: 100px; height: 100px; opacity: 0.3; margin-bottom: 20px;">
                            <path d="M336.5 107.5C336.5 107.5 311 30 371.5 11.5C432 -7 441.5 74 441.5 74C441.5 74 458.5 83 448.5 103C438.5 123 412 131.5 412 131.5" stroke="white" stroke-width="12"/>
                            <path d="M382.5 267.5C382.5 267.5 356.5 278.5 352 303C347.5 327.5 357 340 357 340" stroke="white" stroke-width="12"/>
                            <ellipse cx="373" cy="219.5" rx="25" ry="40" fill="white" stroke="white" stroke-width="12"/>
                            <ellipse cx="371" cy="219.5" rx="12" ry="16.5" fill="white"/>
                            <ellipse cx="491" cy="219.5" rx="25" ry="40" fill="white" stroke="white" stroke-width="12"/>
                            <ellipse cx="489" cy="219.5" rx="12" ry="16.5" fill="white"/>
                            <path d="M429 315.5L450 339" stroke="white" stroke-width="12"/>
                            <path d="M379 344C379 344 385 354.5 431.5 354.5C478 354.5 484 344 484 344" stroke="white" stroke-width="12"/>
                            <path d="M223.5 421.5C223.5 421.5 204 310 281 251.5C358 193 486 193 486 193C486 193 551.5 204 551.5 287.5C551.5 371 471 432 471 432" stroke="white" stroke-width="12"/>
                            <path d="M223.5 421.5C223.5 421.5 190 479 278 550.5C366 622 471 432 471 432" stroke="white" stroke-width="12"/>
                            <path d="M278 550.5C278 550.5 308 622 345.5 724C383 826 360 833 360 833" stroke="white" stroke-width="12"/>
                            <path d="M345.5 724C345.5 724 366 749 409 749C452 749 471 724 471 724" stroke="white" stroke-width="12"/>
                            <path d="M471 724C471 724 496 649 471 546.5C446 444 471 432 471 432" stroke="white" stroke-width="12"/>
                            <path d="M360 833C360 833 324 864 346.5 864C369 864 383 830 383 830" stroke="white" stroke-width="12"/>
                            <path d="M417 833C417 833 453 864 430.5 864C408 864 394 830 394 830" stroke="white" stroke-width="12"/>
                        </svg>
                        <p>Zatím nemáte žádné záznamy</p>
                        <button class="add-btn" style="margin-top: 20px;" id="empty-add-btn">
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
        
        // Určení statusu skupiny
        const statusClass = getGroupStatusClass(group.zive, group.pocet);
        
        // Zobrazení barev kroužků
        let colorDots = '';
        if (group.barvy) {
            const barvy = group.barvy.split(', ');
            barvy.forEach(barva => {
                const colorClass = getColorDotClass(barva);
                colorDots += `<span class="color-dot ${colorClass}"></span>`;
            });
        }
        
        row.innerHTML = `
            <td>
                <div class="group-name">
                    <button class="btn-toggle">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    ${group.druhy}
                </div>
            </td>
            <td>${formatDate(group.datum)}</td>
            <td>${formatAge(group.prumerneStari)}</td>
            <td><span class="tag ${statusClass}">${group.pocet} (${group.zive} živých)</span></td>
            <td>${group.celkovaCena.toLocaleString()} Kč</td>
            <td>${colorDots}${group.barvy || "-"}</td>
            <td class="group-actions">
                <button class="icon-btn" title="Upravit skupinu" data-action="edit-group" data-date="${group.datum}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete" title="Smazat skupinu" data-action="delete-group" data-date="${group.datum}">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="icon-btn" title="Přidat do skupiny" data-action="add-to-group" data-date="${group.datum}">
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
    
    // Event listenery pro akce skupiny
    document.querySelectorAll('[data-action="edit-group"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openGroupEditModal(date);
        });
    });
    
    document.querySelectorAll('[data-action="delete-group"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openGroupDeleteModal(date);
        });
    });
    
    document.querySelectorAll('[data-action="add-to-group"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openAddModal(date);
        });
    });
}

// Získání třídy barvy kroužku
function getColorDotClass(barva) {
    if (!barva) return '';
    
    switch (barva.toLowerCase()) {
        case 'červená': return 'dot-red';
        case 'zelená': return 'dot-green';
        case 'žlutá': return 'dot-yellow';
        case 'modrá': return 'dot-blue';
        default: return '';
    }
}

// Zobrazení detailů skupiny
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
            const colorDotClass = getColorDotClass(barva);
            const colorDot = barva ? `<span class="color-dot ${colorDotClass}"></span>` : '';
            krouzekInfo = `${colorDot}č. ${slepice.cisloKrouzku}`;
        } else if (slepice.stranaKrouzku) {
            const barva = slepice.barvaKrouzku || '';
            const colorDotClass = getColorDotClass(barva);
            const colorDot = barva ? `<span class="color-dot ${colorDotClass}"></span>` : '';
            krouzekInfo = `${colorDot}${slepice.stranaKrouzku} strana`;
        }
        
        // Aktuální stáří pro živé slepice nebo stáří při úmrtí pro zemřelé
        let vekText;
        if (slepice.datumUmrti) {
            vekText = formatAge(slepice.stariPriUmrti);
        } else {
            const aktualniStari = calculateCurrentAge(slepice);
            vekText = formatAge(aktualniStari);
        }
        
        // Status
        const statusHtml = slepice.datumUmrti 
            ? `<span class="status status-deceased">Zemřela</span>` 
            : `<span class="status status-active">Žije</span>`;
        
        row.innerHTML = `
            <td>${slepice.druh}</td>
            <td>${formatAge(slepice.stariPriZakoupeni)}</td>
            <td>
                ${slepice.datumUmrti 
                    ? `${formatDate(slepice.datumUmrti)}<div>${vekText}</div>` 
                    : statusHtml + `<div>${vekText}</div>`
                }
            </td>
            <td>${krouzekInfo}</td>
            <td>${slepice.porizovaci_cena ? `${parseInt(slepice.porizovaci_cena).toLocaleString()}
            <td>${slepice.porizovaci_cena ? `${parseInt(slepice.porizovaci_cena).toLocaleString()} Kč` : "-"}</td>
            <td class="actions">
                <button class="icon-btn" title="Upravit" data-id="${slepice.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete" title="Odstranit" data-id="${slepice.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        detailTableBody.appendChild(row);
    });
    
    // Nastavení event listenerů pro tlačítka
    detailTableBody.querySelectorAll('.icon-btn').forEach(btn => {
        if (btn.querySelector('.fa-edit')) {
            btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
        } else if (btn.querySelector('.fa-trash')) {
            btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
        }
    });
}

// MODÁLNÍ OKNA A FORMULÁŘE

// Otevření modálního okna pro přidání s předvyplněným datem
function openAddModal(predvyplnenyDatum = null) {
    const slepiceModal = document.getElementById('slepice-modal');
    const modalTitle = document.getElementById('modal-title');
    const slepiceForm = document.getElementById('slepice-form');
    const slepiceIdInput = document.getElementById('slepice-id');
    
    modalTitle.textContent = 'Přidat novou slepici';
    slepiceForm.reset();
    slepiceIdInput.value = '';
    
    // Přepnutí na výchozí typ kroužku (číslo)
    document.getElementById('typ-krouzku-cislo').checked = true;
    toggleKrouzekTyp();
    
    // Skrytí stáří při úmrtí
    document.getElementById('stariPriUmrti-group').style.display = 'none';
    
    // Nastavit dnešní datum jako výchozí pro datum zakoupení
    if (predvyplnenyDatum) {
        document.getElementById('datumZakoupeni').value = predvyplnenyDatum;
        
        // Doplnění dalších údajů podle existujících záznamů ve skupině
        const groupSlepice = slepice.filter(s => s.datumZakoupeni === predvyplnenyDatum);
        if (groupSlepice.length > 0) {
            // Předvyplníme druh podle prvního záznamu ve skupině
            document.getElementById('druh').value = groupSlepice[0].druh;
        }
    } else {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('datumZakoupeni').value = today;
    }
    
    // Aktualizace našeptávače druhů
    updateDruhyDatalist();
    
    // Naplnění čísly kroužků
    populateCislaKrouzku();
    
    // Resetování a zobrazení hromadného přidání
    const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
    const hromadnePridaniSection = document.getElementById('hromadne-pridani-section');
    
    if (hromadnePridaniCheck && hromadnePridaniSection) {
        hromadnePridaniCheck.checked = false;
        document.getElementById('hromadne-pridani-container').style.display = 'none';
        hromadnePridaniSection.style.display = 'block';
    }
    
    slepiceModal.classList.add('active');
}

// Otevření modálního okna pro editaci
function openEditModal(id) {
    const slepiceToEdit = slepice.find(s => s.id === id);
    if (!slepiceToEdit) return;
    
    const slepiceModal = document.getElementById('slepice-modal');
    const modalTitle = document.getElementById('modal-title');
    const slepiceIdInput = document.getElementById('slepice-id');
    const druhInput = document.getElementById('druh');
    const datumZakoupeniInput = document.getElementById('datumZakoupeni');
    const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
    const datumUmrtiInput = document.getElementById('datumUmrti');
    const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
    const stariPriUmrtiGroup = document.getElementById('stariPriUmrti-group');
    const barvaKrouzkuInput = document.getElementById('barvaKrouzku');
    const porizovaci_cenaInput = document.getElementById('porizovaci_cena');
    const hromadnePridaniSection = document.getElementById('hromadne-pridani-section');
    
    modalTitle.textContent = 'Upravit záznam';
    
    // Nastavení hodnot formuláře
    slepiceIdInput.value = slepiceToEdit.id;
    druhInput.value = slepiceToEdit.druh;
    datumZakoupeniInput.value = slepiceToEdit.datumZakoupeni;
    stariPriZakoupeniInput.value = slepiceToEdit.stariPriZakoupeni;
    datumUmrtiInput.value = slepiceToEdit.datumUmrti || '';
    stariPriUmrtiInput.value = slepiceToEdit.stariPriUmrti || '';
    barvaKrouzkuInput.value = slepiceToEdit.barvaKrouzku || '';
    
    // Zobrazení/skrytí stáří při úmrtí
    stariPriUmrtiGroup.style.display = slepiceToEdit.datumUmrti ? 'block' : 'none';
    
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
                document.getElementById('cisloKrouzku').value = slepiceToEdit.cisloKrouzku;
            } else {
                // Pokud je to jiný formát, přidáme speciální možnost
                const option = document.createElement('option');
                option.value = slepiceToEdit.cisloKrouzku;
                option.textContent = slepiceToEdit.cisloKrouzku;
                document.getElementById('cisloKrouzku').appendChild(option);
                document.getElementById('cisloKrouzku').value = slepiceToEdit.cisloKrouzku;
            }
        } else {
            document.getElementById('cisloKrouzku').value = '';
        }
    }
    
    porizovaci_cenaInput.value = slepiceToEdit.porizovaci_cena || '';
    
    // Skrytí hromadného přidání při editaci
    if (hromadnePridaniSection) {
        hromadnePridaniSection.style.display = 'none';
    }
    
    // Aktualizace našeptávače druhů
    updateDruhyDatalist();
    
    slepiceModal.classList.add('active');
}

// Otevření modálního okna pro úpravu celé skupiny
function openGroupEditModal(date) {
    const groupEditModal = document.getElementById('group-edit-modal');
    const groupDate = document.getElementById('group-date');
    const groupDruh = document.getElementById('group-druh');
    
    // Najdeme všechny slepice v této skupině
    const groupSlepice = slepice.filter(s => s.datumZakoupeni === date);
    if (groupSlepice.length === 0) return;
    
    // Zjistíme, jaký druh slepic je ve skupině (měl by být jen jeden)
    const druh = groupSlepice[0].druh;
    const formattedDate = formatDate(date);
    
    // Nastavení formuláře
    groupDate.value = date;
    groupDruh.value = druh;
    
    // Aktualizace našeptávače druhů
    updateDruhyDatalist();
    
    // Otevření modálního okna
    groupEditModal.classList.add('active');
}

// Otevření modálního okna pro smazání celé skupiny
function openGroupDeleteModal(date) {
    const groupDeleteModal = document.getElementById('group-delete-modal');
    
    // Najdeme všechny slepice v této skupině
    const groupSlepice = slepice.filter(s => s.datumZakoupeni === date);
    if (groupSlepice.length === 0) return;
    
    // Zjistíme údaje o skupině
    const druh = groupSlepice[0].druh;
    const formattedDate = formatDate(date);
    const groupDeleteName = document.getElementById('group-delete-name');
    
    // Nastavení informací
    groupDeleteName.textContent = `${druh} (${formattedDate}) - ${groupSlepice.length} slepic`;
    document.getElementById('group-delete-confirm').dataset.date = date;
    
    // Otevření modálního okna
    groupDeleteModal.classList.add('active');
}

// Otevření modálního okna pro potvrzení smazání
function openDeleteModal(id) {
    const deleteModal = document.getElementById('delete-modal');
    const slepiceToDelete = slepice.find(s => s.id === id);
    if (!slepiceToDelete) return;
    
    const deleteSlepiceName = document.getElementById('delete-slepice-name');
    const deleteConfirm = document.getElementById('delete-confirm');
    
    const slepiceInfo = slepiceToDelete.cisloKrouzku 
        ? `č. ${slepiceToDelete.cisloKrouzku}` 
        : (slepiceToDelete.stranaKrouzku ? `${slepiceToEdit.stranaKrouzku} strana` : 'bez označení');
    
    deleteSlepiceName.textContent = `${slepiceToDelete.druh} (${slepiceInfo})`;
    deleteConfirm.dataset.id = id;
    
    deleteModal.classList.add('active');
}

// Zavření modálního okna
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Odstranění chybových hlášek
    document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
    });
    
    document.querySelectorAll('.form-control').forEach(el => {
        el.classList.remove('error');
    });
}

// Přepínání mezi číslem kroužku a stranou
function toggleKrouzekTyp() {
    const typCislo = document.getElementById('typ-krouzku-cislo').checked;
    const typStrana = document.getElementById('typ-krouzku-strana').checked;
    
    document.getElementById('cislo-krouzku-group').style.display = typCislo ? 'block' : 'none';
    document.getElementById('strana-krouzku-group').style.display = typStrana ? 'block' : 'none';
}

// Naplnění selectu pro čísla kroužků
function populateCislaKrouzku() {
    const cisloKrouzkuInput = document.getElementById('cisloKrouzku');
    if (!cisloKrouzkuInput) return;
    
    cisloKrouzkuInput.innerHTML = '<option value="">Vyberte číslo</option>';
    
    for (let i = 1; i <= 20; i++) {
        const option = document.createElement('option');
        option.value = i.toString();
        option.textContent = i.toString();
        cisloKrouzkuInput.appendChild(option);
    }
}

// Získání unikátních druhů slepic z existujících záznamů
function updateDruhyDatalist() {
    const druhyDatalist = document.getElementById('druhy-datalist');
    const druhyDatalistGroup = document.getElementById('druhy-datalist-group');
    
    if (druhyDatalist) {
        druhyDatalist.innerHTML = '';
        const uniqueDruhy = [...new Set(slepice.map(s => s.druh))];
        
        uniqueDruhy.forEach(druh => {
            const option = document.createElement('option');
            option.value = druh;
            druhyDatalist.appendChild(option);
        });
    }
    
    if (druhyDatalistGroup) {
        druhyDatalistGroup.innerHTML = '';
        const uniqueDruhy = [...new Set(slepice.map(s => s.druh))];
        
        uniqueDruhy.forEach(druh => {
            const option = document.createElement('option');
            option.value = druh;
            druhyDatalistGroup.appendChild(option);
        });
    }
}

// Automatický výpočet stáří při úmrtí
function calculateStariPriUmrti() {
    const datumZakoupeniInput = document.getElementById('datumZakoupeni');
    const datumUmrtiInput = document.getElementById('datumUmrti');
    const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
    const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
    const stariPriUmrtiGroup = document.getElementById('stariPriUmrti-group');
    
    if (!datumZakoupeniInput || !datumUmrtiInput || !stariPriZakoupeniInput || !stariPriUmrtiInput) return;
    
    if (datumUmrtiInput.value) {
        stariPriUmrtiGroup.style.display = 'block';
        
        if (!datumZakoupeniInput.value || !stariPriZakoupeniInput.value) {
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
    } else {
        stariPriUmrtiGroup.style.display = 'none';
        stariPriUmrtiInput.value = '';
    }
}

// Přepnutí zobrazení hromadného přidání
function toggleHromadnePridani() {
    const hromadnePridaniContainer = document.getElementById('hromadne-pridani-container');
    const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
    
    if (!hromadnePridaniContainer || !hromadnePridaniCheck) return;
    
    hromadnePridaniContainer.style.display = hromadnePridaniCheck.checked ? 'block' : 'none';
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
   
   if (datumUmrti) {
       // Automatický výpočet stáří při úmrtí, pokud není zadáno
       if (!document.getElementById('stariPriUmrti').value) {
           calculateStariPriUmrti();
       }
       
       // Ověření, že datum úmrtí je pozdější než datum zakoupení
       const datumZakoupeni = new Date(document.getElementById('datumZakoupeni').value);
       const datumUmrtiDate = new Date(datumUmrti);
       
       if (datumUmrtiDate <= datumZakoupeni) {
           document.getElementById('datumUmrti').classList.add('error');
           document.getElementById('datumUmrti-error').textContent = 'Datum úmrtí musí být pozdější než datum zakoupení';
           isValid = false;
       }
   }
   
   // Kontrola hromadného přidání
   const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
   if (hromadnePridaniCheck && hromadnePridaniCheck.checked) {
       const pocetSlepicInput = document.getElementById('pocet-slepic');
       if (!pocetSlepicInput.value || parseInt(pocetSlepicInput.value) < 2) {
           pocetSlepicInput.classList.add('error');
           document.getElementById('pocet-slepic-error').textContent = 'Zadejte počet slepic (minimálně 2)';
           isValid = false;
       } else {
           pocetSlepicInput.classList.remove('error');
           document.getElementById('pocet-slepic-error').textContent = '';
       }
       
       // Kontrola čísla kroužku pro hromadné přidání při výběru typu číslo
       if (document.getElementById('typ-krouzku-cislo').checked) {
           const cisloKrouzku = document.getElementById('cisloKrouzku').value;
           if (!cisloKrouzku) {
               document.getElementById('cisloKrouzku').classList.add('error');
               document.getElementById('cisloKrouzku-error').textContent = 'Pro hromadné přidání musíte zadat číslo prvního kroužku';
               isValid = false;
           }
       }
   }
   
   return isValid;
}

// Uložení formuláře
function saveForm() {
   if (!validateForm()) return;
   
   const slepiceId = document.getElementById('slepice-id').value;
   const isEditing = slepiceId !== '';
   
   const druhInput = document.getElementById('druh');
   const datumZakoupeniInput = document.getElementById('datumZakoupeni');
   const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
   const datumUmrtiInput = document.getElementById('datumUmrti');
   const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
   const barvaKrouzkuInput = document.getElementById('barvaKrouzku');
   const porizovaci_cenaInput = document.getElementById('porizovaci_cena');
   
   const typCislo = document.getElementById('typ-krouzku-cislo').checked;
   
   const baseSlepice = {
       druh: druhInput.value,
       datumZakoupeni: datumZakoupeniInput.value,
       stariPriZakoupeni: parseInt(stariPriZakoupeniInput.value),
       datumUmrti: datumUmrtiInput.value || '',
       stariPriUmrti: stariPriUmrtiInput.value ? parseInt(stariPriUmrtiInput.value) : null,
       barvaKrouzku: barvaKrouzkuInput.value,
       porizovaci_cena: porizovaci_cenaInput.value ? parseInt(porizovaci_cenaInput.value) : null,
       cisloKrouzku: typCislo ? document.getElementById('cisloKrouzku').value : '',
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
       const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
       const pocetSlepicInput = document.getElementById('pocet-slepic');
       
       if (hromadnePridaniCheck && hromadnePridaniCheck.checked && pocetSlepicInput && pocetSlepicInput.value) {
           const pocet = parseInt(pocetSlepicInput.value);
           const startId = slepice.length > 0 ? Math.max(...slepice.map(s => s.id)) + 1 : 1;
           
           if (typCislo) {
               // Hromadné přidání s čísly kroužků
               let baseKrouzek = parseInt(document.getElementById('cisloKrouzku').value);
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
               // Hromadné přidání se stranou kroužku - střídáme levou a pravou
               const strany = ['levá', 'pravá'];
               
               for (let i = 0; i < pocet; i++) {
                   const strana = strany[i % 2]; // Střídáme levou a pravou stranu
                   
                   const novaSlepice = {
                       id: startId + i,
                       ...baseSlepice,
                       cisloKrouzku: '',
                       stranaKrouzku: strana
                   };
                   
                   slepice.push(novaSlepice);
               }
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
   
   // Aktualizace UI
   updateUI();
   
   // Zavření modálního okna
   closeModal('slepice-modal');
}

// Úprava celé skupiny slepic
function saveGroupEdit() {
    const groupDate = document.getElementById('group-date').value;
    const groupDruh = document.getElementById('group-druh').value;
    const groupBarvaKrouzku = document.getElementById('group-barvaKrouzku').value;
    const groupPorizovaci_cena = document.getElementById('group-porizovaci_cena').value;
    
    // Validace
    let isValid = true;
    
    if (!groupDruh.trim()) {
        document.getElementById('group-druh').classList.add('error');
        document.getElementById('group-druh-error').textContent = 'Zadejte druh slepice';
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Najdeme všechny slepice v této skupině
    const groupIndices = slepice.reduce((indices, s, index) => {
        if (s.datumZakoupeni === groupDate) {
            indices.push(index);
        }
        return indices;
    }, []);
    
    // Aktualizace všech slepic ve skupině
    groupIndices.forEach(index => {
        slepice[index].druh = groupDruh;
        
        // Aktualizace barvy kroužku, pokud byla zadána
        if (groupBarvaKrouzku) {
            slepice[index].barvaKrouzku = groupBarvaKrouzku;
        }
        
        // Aktualizace pořizovací ceny, pokud byla zadána
        if (groupPorizovaci_cena) {
            slepice[index].porizovaci_cena = parseInt(groupPorizovaci_cena);
        }
    });
    
    // Uložení dat
    saveData();
    
    // Aktualizace UI
    updateUI();
    
    // Zavření modálního okna
    closeModal('group-edit-modal');
}

// Smazání celé skupiny slepic
function deleteGroup(date) {
    // Filtrujeme slepice, které nejsou v této skupině
    slepice = slepice.filter(s => s.datumZakoupeni !== date);
    
    // Uložení dat
    saveData();
    
    // Aktualizace UI
    updateUI();
    
    // Zavření modálního okna
    closeModal('group-delete-modal');
}

// Odstranění slepice
function deleteSlepice(id) {
   const index = slepice.findIndex(s => s.id === id);
   if (index !== -1) {
       slepice.splice(index, 1);
       
       // Uložení dat
       saveData();
       
       // Aktualizace UI
       updateUI();
   }
   
   // Zavření modálního okna
   closeModal('delete-modal');
}

// Event listenery
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, initializing app");
    
    // Nejprve načteme lokální data a zobrazíme je
    loadData();
    updateUI();
    
    // Nastavíme správný výchozí zobrazení
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('detail-view').style.display = 'none';
    
    // Přidání event listeneru pro přepínání pohledů
    const folderCard = document.getElementById('folder-card');
    if (folderCard) {
        folderCard.addEventListener('click', function() {
            console.log("Kliknuto na složku");
            document.getElementById('main-view').style.display = 'none';
            document.getElementById('detail-view').style.display = 'block';
        });
    }
    
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            console.log("Kliknuto na zpět");
            document.getElementById('main-view').style.display = 'block';
            document.getElementById('detail-view').style.display = 'none';
        });
    }
    
    // Přidání event listeneru pro přihlášení
    const loginBtn = document.getElementById('google-login-btn');
    if (loginBtn) {
        console.log("Tlačítko pro přihlášení nalezeno");
        loginBtn.addEventListener('click', function() {
            console.log("Kliknuto na přihlášení");
            signInWithGoogle();
        });
    }
    
    // Přidání event listeneru pro odhlášení
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
    }
    
    // Přidání event listeneru pro tlačítko přidat slepici
    const addSlepiceBtn = document.getElementById('add-slepice-btn');
    if (addSlepiceBtn) {
        addSlepiceBtn.addEventListener('click', function() {
            console.log("Kliknuto na přidat slepici");
            openAddModal();
        });
    }
    
    // Událost změny data úmrtí
    const datumUmrtiInput = document.getElementById('datumUmrti');
    if (datumUmrtiInput) {
        datumUmrtiInput.addEventListener('change', calculateStariPriUmrti);
    }
    
    // Události změny datumu zakoupení a stáří
    const datumZakoupeniInput =// Globální proměnné pro Firebase
let auth, db, currentUser;

// Globální proměnná pro data
let slepice = [];

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
                    updateUI();
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
                // onAuthStateChanged se postará o aktualizaci UI
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
            // onAuthStateChanged se postará o aktualizaci UI
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
                
                // Uložení do localStorage jako záloha
                localStorage.setItem('slepice-data', JSON.stringify(slepice));
                
                // Aktualizace UI
                updateUI();
            } else {
                console.log("Žádná data v Firestore, použijeme lokální data");
                // Pokud uživatel nemá data v cloudu, použijeme lokální, pokud existují
                loadData();
                if (slepice.length > 0) {
                    // Uložíme lokální data do cloudu
                    saveUserData();
                }
                
                updateUI();
            }
        })
        .catch((error) => {
            console.error("Chyba při načítání dat z Firestore:", error);
            // Záložní načtení z localStorage
            loadData();
            updateUI();
        });
}

// Uložení dat uživatele do Firebase
function saveUserData() {
    if (!currentUser || !db) {
        console.error("Nelze uložit data - uživatel nebo databáze nejsou k dispozici");
        return;
    }
    
    console.log("Ukládání dat do Firestore pro uživatele:", currentUser.uid);
    
    // Přístup po jednotlivých dokumentech pro větší spolehlivost
    const promises = slepice.map(s => {
        return db.collection('users').doc(currentUser.uid).collection('slepice').doc(s.id.toString())
            .set(s)
            .then(() => {
                console.log(`Slepice ID ${s.id} úspěšně uložena`);
            })
            .catch(error => {
                console.error(`Chyba při ukládání slepice ID ${s.id}:`, error);
            });
    });
    
    Promise.all(promises)
        .then(() => {
            console.log("Všechna data úspěšně uložena do Firestore");
        })
        .catch((error) => {
            console.error("Chyba při ukládání dat do Firestore:", error);
        });
}

// Načtení dat z localStorage při startu
function loadData() {
    const savedData = localStorage.getItem('slepice-data');
    if (savedData) {
        try {
            slepice = JSON.parse(savedData);
            console.log("Data načtena z localStorage, počet záznamů:", slepice.length);
        } catch (e) {
            console.error('Chyba při načítání dat z localStorage:', e);
            // Pokud dojde k chybě, použijeme výchozí data
            initDefaultData();
        }
    } else {
        console.log("Žádná data v localStorage, použijeme výchozí data");
        initDefaultData();
    }
}

// Inicializace výchozích dat
function initDefaultData() {
    slepice = [
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
}

// Uložení dat do localStorage
function saveData() {
    // Uložení do localStorage
    localStorage.setItem('slepice-data', JSON.stringify(slepice));
    console.log("Data uložena do localStorage, počet záznamů:", slepice.length);
    
    // Pokud je uživatel přihlášen, uložíme data i do cloudu
    if (currentUser) {
        saveUserData();
    }
}

// Aktualizace celého UI
function updateUI() {
    // Aktualizace pohledu složek
    updateFolderView();
    
    // Aktualizace detailního pohledu
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
    
    // Aktualizace statistik
    updateStats();
}

// Aktualizace statistik na hlavní stránce (v složce)
function updateFolderView() {
    const activeSlepice = slepice.filter(s => !s.datumUmrti);
    const historicalSlepice = slepice.filter(s => s.datumUmrti);
    
    document.getElementById('stat-live-folder').textContent = activeSlepice.length;
    document.getElementById('stat-dead-folder').textContent = historicalSlepice.length;
}

// Aktualizace statistik v detailním pohledu
function updateStats() {
    const activeSlepice = slepice.filter(s => !s.datumUmrti);
    const historicalSlepice = slepice.filter(s => s.datumUmrti);
    const totalInvestment = slepice.reduce((sum, s) => sum + (parseInt(s.porizovaci_cena) || 0), 0);
    
    document.getElementById('stat-total').textContent = activeSlepice.length;
    document.getElementById('stat-investment').textContent = `${totalInvestment.toLocaleString()} Kč`;
    document.getElementById('stat-historical').textContent = historicalSlepice.length;
}

// Formátování data
function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
}

// Formátování stáří v týdnech/měsících/letech
function formatAge(weeks) {
    if (!weeks) return "-";
    
    weeks = parseInt(weeks);
    
    if (weeks < 26) {
        // Méně než 6 měsíců - zobrazit v týdnech
        return `${weeks} týdnů`;
    } else if (weeks < 52) {
        // 6-12 měsíců - zobrazit v měsících
        const months = Math.floor(weeks / 4.33);
        return `${months} měsíců`;
    } else {
        // Více než rok - zobrazit v letech a měsících
        const years = Math.floor(weeks / 52);
        const remainingWeeks = weeks % 52;
        const months = Math.floor(remainingWeeks / 4.33);
        
        if (months === 0) {
            return years === 1 ? `1 rok` : `${years} let`;
        } else {
            return years === 1 
                ? `1 rok ${months} ${getMonthWord(months)}` 
                : `${years} let ${months} ${getMonthWord(months)}`;
        }
    }
}

// Pomocná funkce pro skloňování slova "měsíc"
function getMonthWord(months) {
    if (months === 1) return "měsíc";
    if (months >= 2 && months <= 4) return "měsíce";
    return "měsíců";
}

// Výpočet aktuálního stáří slepice (pro živé slepice)
function calculateCurrentAge(slepice) {
    const datumZakoupeni = new Date(slepice.datumZakoupeni);
    const stariPriZakoupeni = parseInt(slepice.stariPriZakoupeni);
    
    // Výpočet rozdílu v týdnech mezi datem zakoupení a dnešním datem
    const today = new Date();
    const rozdilDny = Math.floor((today - datumZakoupeni) / (1000 * 60 * 60 * 24));
    const rozdilTydny = Math.floor(rozdilDny / 7);
    
    // Aktuální stáří = stáří při zakoupení + počet týdnů od zakoupení
    return stariPriZakoupeni + rozdilTydny;
}

// Získání statusu skupiny podle poměru živých slepic
function getGroupStatusClass(zive, total) {
    // Zjistíme poměr živých slepic
    const ratio = zive / total;
    
    if (ratio === 1) {
        return "tag-green"; // Všechny žijí
    } else if (ratio >= 0.5) {
        return "tag-yellow"; // 50% a více žije
    } else {
        return "tag-red"; // Méně než 50% žije
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
        
        // Výpočet průměrného stáří slepic ve skupině
        const prumerneStari = slepiceGroup.reduce((sum, s) => {
            // Pro zemřelé slepice použijeme stáří při úmrtí
            if (s.datumUmrti && s.stariPriUmrti) {
                return sum + parseInt(s.stariPriUmrti);
            } 
            // Pro živé slepice vypočítáme aktuální stáří
            else {
                return sum + calculateCurrentAge(s);
            }
        }, 0) / slepiceGroup.length;
        
        return {
            datum: datum,
            slepice: slepiceGroup,
            pocet: slepiceGroup.length,
            zive: zive,
            celkovaCena: celkovaCena,
            druhy: druhy.join(", "),
            barvy: barvy.join(", "),
            rozsahCisel: rozsahCisel,
            strany: stranyText,
            prumerneStari: Math.round(prumerneStari)
        };
    }).sort((a, b) => new Date(b.datum) - new Date(a.datum)); // Seřazení od nejnovějších
}

// Funkce pro zobrazení skupin na hlavní stránce
function renderSlepiceGroups(groups) {
    const slepiceTableBody = document.getElementById('slepice-table-body');
    slepiceTableBody.innerHTML = '';
    
    if (groups.length === 0) {
        slepiceTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <svg class="chicken-icon" viewBox="0 0 600 800" fill="none" style="width: 100px; height: 100px; opacity: 0.3; margin-bottom: 20px;">
                            <path d="M336.5 107.5C336.5 107.5 311 30 371.5 11.5C432 -7 441.5 74 441.5 74C441.5 74 458.5 83 448.5 103C438.5 123 412 131.5 412 131.5" stroke="white" stroke-width="12"/>
                            <path d="M382.5 267.5C382.5 267.5 356.5 278.5 352 303C347.5 327.5 357 340 357 340" stroke="white" stroke-width="12"/>
                            <ellipse cx="373" cy="219.5" rx="25" ry="40" fill="white" stroke="white" stroke-width="12"/>
                            <ellipse cx="371" cy="219.5" rx="12" ry="16.5" fill="white"/>
                            <ellipse cx="491" cy="219.5" rx="25" ry="40" fill="white" stroke="white" stroke-width="12"/>
                            <ellipse cx="489" cy="219.5" rx="12" ry="16.5" fill="white"/>
                            <path d="M429 315.5L450 339" stroke="white" stroke-width="12"/>
                            <path d="M379 344C379 344 385 354.5 431.5 354.5C478 354.5 484 344 484 344" stroke="white" stroke-width="12"/>
                            <path d="M223.5 421.5C223.5 421.5 204 310 281 251.5C358 193 486 193 486 193C486 193 551.5 204 551.5 287.5C551.5 371 471 432 471 432" stroke="white" stroke-width="12"/>
                            <path d="M223.5 421.5C223.5 421.5 190 479 278 550.5C366 622 471 432 471 432" stroke="white" stroke-width="12"/>
                            <path d="M278 550.5C278 550.5 308 622 345.5 724C383 826 360 833 360 833" stroke="white" stroke-width="12"/>
                            <path d="M345.5 724C345.5 724 366 749 409 749C452 749 471 724 471 724" stroke="white" stroke-width="12"/>
                            <path d="M471 724C471 724 496 649 471 546.5C446 444 471 432 471 432" stroke="white" stroke-width="12"/>
                            <path d="M360 833C360 833 324 864 346.5 864C369 864 383 830 383 830" stroke="white" stroke-width="12"/>
                            <path d="M417 833C417 833 453 864 430.5 864C408 864 394 830 394 830" stroke="white" stroke-width="12"/>
                        </svg>
                        <p>Zatím nemáte žádné záznamy</p>
                        <button class="add-btn" style="margin-top: 20px;" id="empty-add-btn">
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
        
        // Určení statusu skupiny
        const statusClass = getGroupStatusClass(group.zive, group.pocet);
        
        // Zobrazení barev kroužků
        let colorDots = '';
        if (group.barvy) {
            const barvy = group.barvy.split(', ');
            barvy.forEach(barva => {
                const colorClass = getColorDotClass(barva);
                colorDots += `<span class="color-dot ${colorClass}"></span>`;
            });
        }
        
        row.innerHTML = `
            <td>
                <div class="group-name">
                    <button class="btn-toggle">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    ${group.druhy}
                </div>
            </td>
            <td>${formatDate(group.datum)}</td>
            <td>${formatAge(group.prumerneStari)}</td>
            <td><span class="tag ${statusClass}">${group.pocet} (${group.zive} živých)</span></td>
            <td>${group.celkovaCena.toLocaleString()} Kč</td>
            <td>${colorDots}${group.barvy || "-"}</td>
            <td class="group-actions">
                <button class="icon-btn" title="Upravit skupinu" data-action="edit-group" data-date="${group.datum}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete" title="Smazat skupinu" data-action="delete-group" data-date="${group.datum}">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="icon-btn" title="Přidat do skupiny" data-action="add-to-group" data-date="${group.datum}">
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
    
    // Event listenery pro akce skupiny
    document.querySelectorAll('[data-action="edit-group"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openGroupEditModal(date);
        });
    });
    
    document.querySelectorAll('[data-action="delete-group"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openGroupDeleteModal(date);
        });
    });
    
    document.querySelectorAll('[data-action="add-to-group"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openAddModal(date);
        });
    });
}

// Získání třídy barvy kroužku
function getColorDotClass(barva) {
    if (!barva) return '';
    
    switch (barva.toLowerCase()) {
        case 'červená': return 'dot-red';
        case 'zelená': return 'dot-green';
        case 'žlutá': return 'dot-yellow';
        case 'modrá': return 'dot-blue';
        default: return '';
    }
}

// Zobrazení detailů skupiny
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
            const colorDotClass = getColorDotClass(barva);
            const colorDot = barva ? `<span class="color-dot ${colorDotClass}"></span>` : '';
            krouzekInfo = `${colorDot}č. ${slepice.cisloKrouzku}`;
        } else if (slepice.stranaKrouzku) {
            const barva = slepice.barvaKrouzku || '';
            const colorDotClass = getColorDotClass(barva);
            const colorDot = barva ? `<span class="color-dot ${colorDotClass}"></span>` : '';
            krouzekInfo = `${colorDot}${slepice.stranaKrouzku} strana`;
        }
        
        // Aktuální stáří pro živé slepice nebo stáří při úmrtí pro zemřelé
        let vekText;
        if (slepice.datumUmrti) {
            vekText = formatAge(slepice.stariPriUmrti);
        } else {
            const aktualniStari = calculateCurrentAge(slepice);
            vekText = formatAge(aktualniStari);
        }
        
        // Status
        const statusHtml = slepice.datumUmrti 
            ? `<span class="status status-deceased">Zemřela</span>` 
            : `<span class="status status-active">Žije</span>`;
        
        row.innerHTML = `
            <td>${slepice.druh}</td>
            <td>${formatAge(slepice.stariPriZakoupeni)}</td>
            <td>
                ${slepice.datumUmrti 
                    ? `${formatDate(slepice.datumUmrti)}<div>${vekText}</div>` 
                    : statusHtml + `<div>${vekText}</div>`
                }
            </td>
            <td>${krouzekInfo}</td>
            <td>${slepice.porizovaci_cena ? `${parseInt(slepice.porizovaci_cena).toLocaleString()}
            <td>${slepice.porizovaci_cena ? `${parseInt(slepice.porizovaci_cena).toLocaleString()} Kč` : "-"}</td>
            <td class="actions">
                <button class="icon-btn" title="Upravit" data-id="${slepice.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete" title="Odstranit" data-id="${slepice.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        detailTableBody.appendChild(row);
    });
    
    // Nastavení event listenerů pro tlačítka
    detailTableBody.querySelectorAll('.icon-btn').forEach(btn => {
        if (btn.querySelector('.fa-edit')) {
            btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
        } else if (btn.querySelector('.fa-trash')) {
            btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)));
        }
    });
}

// MODÁLNÍ OKNA A FORMULÁŘE

// Otevření modálního okna pro přidání s předvyplněným datem
function openAddModal(predvyplnenyDatum = null) {
    const slepiceModal = document.getElementById('slepice-modal');
    const modalTitle = document.getElementById('modal-title');
    const slepiceForm = document.getElementById('slepice-form');
    const slepiceIdInput = document.getElementById('slepice-id');
    
    modalTitle.textContent = 'Přidat novou slepici';
    slepiceForm.reset();
    slepiceIdInput.value = '';
    
    // Přepnutí na výchozí typ kroužku (číslo)
    document.getElementById('typ-krouzku-cislo').checked = true;
    toggleKrouzekTyp();
    
    // Skrytí stáří při úmrtí
    document.getElementById('stariPriUmrti-group').style.display = 'none';
    
    // Nastavit dnešní datum jako výchozí pro datum zakoupení
    if (predvyplnenyDatum) {
        document.getElementById('datumZakoupeni').value = predvyplnenyDatum;
        
        // Doplnění dalších údajů podle existujících záznamů ve skupině
        const groupSlepice = slepice.filter(s => s.datumZakoupeni === predvyplnenyDatum);
        if (groupSlepice.length > 0) {
            // Předvyplníme druh podle prvního záznamu ve skupině
            document.getElementById('druh').value = groupSlepice[0].druh;
        }
    } else {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('datumZakoupeni').value = today;
    }
    
    // Aktualizace našeptávače druhů
    updateDruhyDatalist();
    
    // Naplnění čísly kroužků
    populateCislaKrouzku();
    
    // Resetování a zobrazení hromadného přidání
    const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
    const hromadnePridaniSection = document.getElementById('hromadne-pridani-section');
    
    if (hromadnePridaniCheck && hromadnePridaniSection) {
        hromadnePridaniCheck.checked = false;
        document.getElementById('hromadne-pridani-container').style.display = 'none';
        hromadnePridaniSection.style.display = 'block';
    }
    
    slepiceModal.classList.add('active');
}

// Otevření modálního okna pro editaci
function openEditModal(id) {
    const slepiceToEdit = slepice.find(s => s.id === id);
    if (!slepiceToEdit) return;
    
    const slepiceModal = document.getElementById('slepice-modal');
    const modalTitle = document.getElementById('modal-title');
    const slepiceIdInput = document.getElementById('slepice-id');
    const druhInput = document.getElementById('druh');
    const datumZakoupeniInput = document.getElementById('datumZakoupeni');
    const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
    const datumUmrtiInput = document.getElementById('datumUmrti');
    const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
    const stariPriUmrtiGroup = document.getElementById('stariPriUmrti-group');
    const barvaKrouzkuInput = document.getElementById('barvaKrouzku');
    const porizovaci_cenaInput = document.getElementById('porizovaci_cena');
    const hromadnePridaniSection = document.getElementById('hromadne-pridani-section');
    
    modalTitle.textContent = 'Upravit záznam';
    
    // Nastavení hodnot formuláře
    slepiceIdInput.value = slepiceToEdit.id;
    druhInput.value = slepiceToEdit.druh;
    datumZakoupeniInput.value = slepiceToEdit.datumZakoupeni;
    stariPriZakoupeniInput.value = slepiceToEdit.stariPriZakoupeni;
    datumUmrtiInput.value = slepiceToEdit.datumUmrti || '';
    stariPriUmrtiInput.value = slepiceToEdit.stariPriUmrti || '';
    barvaKrouzkuInput.value = slepiceToEdit.barvaKrouzku || '';
    
    // Zobrazení/skrytí stáří při úmrtí
    stariPriUmrtiGroup.style.display = slepiceToEdit.datumUmrti ? 'block' : 'none';
    
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
                document.getElementById('cisloKrouzku').value = slepiceToEdit.cisloKrouzku;
            } else {
                // Pokud je to jiný formát, přidáme speciální možnost
                const option = document.createElement('option');
                option.value = slepiceToEdit.cisloKrouzku;
                option.textContent = slepiceToEdit.cisloKrouzku;
                document.getElementById('cisloKrouzku').appendChild(option);
                document.getElementById('cisloKrouzku').value = slepiceToEdit.cisloKrouzku;
            }
        } else {
            document.getElementById('cisloKrouzku').value = '';
        }
    }
    
    porizovaci_cenaInput.value = slepiceToEdit.porizovaci_cena || '';
    
    // Skrytí hromadného přidání při editaci
    if (hromadnePridaniSection) {
        hromadnePridaniSection.style.display = 'none';
    }
    
    // Aktualizace našeptávače druhů
    updateDruhyDatalist();
    
    slepiceModal.classList.add('active');
}

// Otevření modálního okna pro úpravu celé skupiny
function openGroupEditModal(date) {
    const groupEditModal = document.getElementById('group-edit-modal');
    const groupDate = document.getElementById('group-date');
    const groupDruh = document.getElementById('group-druh');
    
    // Najdeme všechny slepice v této skupině
    const groupSlepice = slepice.filter(s => s.datumZakoupeni === date);
    if (groupSlepice.length === 0) return;
    
    // Zjistíme, jaký druh slepic je ve skupině (měl by být jen jeden)
    const druh = groupSlepice[0].druh;
    const formattedDate = formatDate(date);
    
    // Nastavení formuláře
    groupDate.value = date;
    groupDruh.value = druh;
    
    // Aktualizace našeptávače druhů
    updateDruhyDatalist();
    
    // Otevření modálního okna
    groupEditModal.classList.add('active');
}

// Otevření modálního okna pro smazání celé skupiny
function openGroupDeleteModal(date) {
    const groupDeleteModal = document.getElementById('group-delete-modal');
    
    // Najdeme všechny slepice v této skupině
    const groupSlepice = slepice.filter(s => s.datumZakoupeni === date);
    if (groupSlepice.length === 0) return;
    
    // Zjistíme údaje o skupině
    const druh = groupSlepice[0].druh;
    const formattedDate = formatDate(date);
    const groupDeleteName = document.getElementById('group-delete-name');
    
    // Nastavení informací
    groupDeleteName.textContent = `${druh} (${formattedDate}) - ${groupSlepice.length} slepic`;
    document.getElementById('group-delete-confirm').dataset.date = date;
    
    // Otevření modálního okna
    groupDeleteModal.classList.add('active');
}

// Otevření modálního okna pro potvrzení smazání
function openDeleteModal(id) {
    const deleteModal = document.getElementById('delete-modal');
    const slepiceToDelete = slepice.find(s => s.id === id);
    if (!slepiceToDelete) return;
    
    const deleteSlepiceName = document.getElementById('delete-slepice-name');
    const deleteConfirm = document.getElementById('delete-confirm');
    
    const slepiceInfo = slepiceToDelete.cisloKrouzku 
        ? `č. ${slepiceToDelete.cisloKrouzku}` 
        : (slepiceToDelete.stranaKrouzku ? `${slepiceToEdit.stranaKrouzku} strana` : 'bez označení');
    
    deleteSlepiceName.textContent = `${slepiceToDelete.druh} (${slepiceInfo})`;
    deleteConfirm.dataset.id = id;
    
    deleteModal.classList.add('active');
}

// Zavření modálního okna
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Odstranění chybových hlášek
    document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
    });
    
    document.querySelectorAll('.form-control').forEach(el => {
        el.classList.remove('error');
    });
}

// Přepínání mezi číslem kroužku a stranou
function toggleKrouzekTyp() {
    const typCislo = document.getElementById('typ-krouzku-cislo').checked;
    const typStrana = document.getElementById('typ-krouzku-strana').checked;
    
    document.getElementById('cislo-krouzku-group').style.display = typCislo ? 'block' : 'none';
    document.getElementById('strana-krouzku-group').style.display = typStrana ? 'block' : 'none';
}

// Naplnění selectu pro čísla kroužků
function populateCislaKrouzku() {
    const cisloKrouzkuInput = document.getElementById('cisloKrouzku');
    if (!cisloKrouzkuInput) return;
    
    cisloKrouzkuInput.innerHTML = '<option value="">Vyberte číslo</option>';
    
    for (let i = 1; i <= 20; i++) {
        const option = document.createElement('option');
        option.value = i.toString();
        option.textContent = i.toString();
        cisloKrouzkuInput.appendChild(option);
    }
}

// Získání unikátních druhů slepic z existujících záznamů
function updateDruhyDatalist() {
    const druhyDatalist = document.getElementById('druhy-datalist');
    const druhyDatalistGroup = document.getElementById('druhy-datalist-group');
    
    if (druhyDatalist) {
        druhyDatalist.innerHTML = '';
        const uniqueDruhy = [...new Set(slepice.map(s => s.druh))];
        
        uniqueDruhy.forEach(druh => {
            const option = document.createElement('option');
            option.value = druh;
            druhyDatalist.appendChild(option);
        });
    }
    
    if (druhyDatalistGroup) {
        druhyDatalistGroup.innerHTML = '';
        const uniqueDruhy = [...new Set(slepice.map(s => s.druh))];
        
        uniqueDruhy.forEach(druh => {
            const option = document.createElement('option');
            option.value = druh;
            druhyDatalistGroup.appendChild(option);
        });
    }
}

// Automatický výpočet stáří při úmrtí
function calculateStariPriUmrti() {
    const datumZakoupeniInput = document.getElementById('datumZakoupeni');
    const datumUmrtiInput = document.getElementById('datumUmrti');
    const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
    const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
    const stariPriUmrtiGroup = document.getElementById('stariPriUmrti-group');
    
    if (!datumZakoupeniInput || !datumUmrtiInput || !stariPriZakoupeniInput || !stariPriUmrtiInput) return;
    
    if (datumUmrtiInput.value) {
        stariPriUmrtiGroup.style.display = 'block';
        
        if (!datumZakoupeniInput.value || !stariPriZakoupeniInput.value) {
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
    } else {
        stariPriUmrtiGroup.style.display = 'none';
        stariPriUmrtiInput.value = '';
    }
}

// Přepnutí zobrazení hromadného přidání
function toggleHromadnePridani() {
    const hromadnePridaniContainer = document.getElementById('hromadne-pridani-container');
    const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
    
    if (!hromadnePridaniContainer || !hromadnePridaniCheck) return;
    
    hromadnePridaniContainer.style.display = hromadnePridaniCheck.checked ? 'block' : 'none';
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
   
   if (datumUmrti) {
       // Automatický výpočet stáří při úmrtí, pokud není zadáno
       if (!document.getElementById('stariPriUmrti').value) {
           calculateStariPriUmrti();
       }
       
       // Ověření, že datum úmrtí je pozdější než datum zakoupení
       const datumZakoupeni = new Date(document.getElementById('datumZakoupeni').value);
       const datumUmrtiDate = new Date(datumUmrti);
       
       if (datumUmrtiDate <= datumZakoupeni) {
           document.getElementById('datumUmrti').classList.add('error');
           document.getElementById('datumUmrti-error').textContent = 'Datum úmrtí musí být pozdější než datum zakoupení';
           isValid = false;
       }
   }
   
   // Kontrola hromadného přidání
   const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
   if (hromadnePridaniCheck && hromadnePridaniCheck.checked) {
       const pocetSlepicInput = document.getElementById('pocet-slepic');
       if (!pocetSlepicInput.value || parseInt(pocetSlepicInput.value) < 2) {
           pocetSlepicInput.classList.add('error');
           document.getElementById('pocet-slepic-error').textContent = 'Zadejte počet slepic (minimálně 2)';
           isValid = false;
       } else {
           pocetSlepicInput.classList.remove('error');
           document.getElementById('pocet-slepic-error').textContent = '';
       }
       
       // Kontrola čísla kroužku pro hromadné přidání při výběru typu číslo
       if (document.getElementById('typ-krouzku-cislo').checked) {
           const cisloKrouzku = document.getElementById('cisloKrouzku').value;
           if (!cisloKrouzku) {
               document.getElementById('cisloKrouzku').classList.add('error');
               document.getElementById('cisloKrouzku-error').textContent = 'Pro hromadné přidání musíte zadat číslo prvního kroužku';
               isValid = false;
           }
       }
   }
   
   return isValid;
}

// Uložení formuláře
function saveForm() {
   if (!validateForm()) return;
   
   const slepiceId = document.getElementById('slepice-id').value;
   const isEditing = slepiceId !== '';
   
   const druhInput = document.getElementById('druh');
   const datumZakoupeniInput = document.getElementById('datumZakoupeni');
   const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
   const datumUmrtiInput = document.getElementById('datumUmrti');
   const stariPriUmrtiInput = document.getElementById('stariPriUmrti');
   const barvaKrouzkuInput = document.getElementById('barvaKrouzku');
   const porizovaci_cenaInput = document.getElementById('porizovaci_cena');
   
   const typCislo = document.getElementById('typ-krouzku-cislo').checked;
   
   const baseSlepice = {
       druh: druhInput.value,
       datumZakoupeni: datumZakoupeniInput.value,
       stariPriZakoupeni: parseInt(stariPriZakoupeniInput.value),
       datumUmrti: datumUmrtiInput.value || '',
       stariPriUmrti: stariPriUmrtiInput.value ? parseInt(stariPriUmrtiInput.value) : null,
       barvaKrouzku: barvaKrouzkuInput.value,
       porizovaci_cena: porizovaci_cenaInput.value ? parseInt(porizovaci_cenaInput.value) : null,
       cisloKrouzku: typCislo ? document.getElementById('cisloKrouzku').value : '',
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
       const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
       const pocetSlepicInput = document.getElementById('pocet-slepic');
       
       if (hromadnePridaniCheck && hromadnePridaniCheck.checked && pocetSlepicInput && pocetSlepicInput.value) {
           const pocet = parseInt(pocetSlepicInput.value);
           const startId = slepice.length > 0 ? Math.max(...slepice.map(s => s.id)) + 1 : 1;
           
           if (typCislo) {
               // Hromadné přidání s čísly kroužků
               let baseKrouzek = parseInt(document.getElementById('cisloKrouzku').value);
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
               // Hromadné přidání se stranou kroužku - střídáme levou a pravou
               const strany = ['levá', 'pravá'];
               
               for (let i = 0; i < pocet; i++) {
                   const strana = strany[i % 2]; // Střídáme levou a pravou stranu
                   
                   const novaSlepice = {
                       id: startId + i,
                       ...baseSlepice,
                       cisloKrouzku: '',
                       stranaKrouzku: strana
                   };
                   
                   slepice.push(novaSlepice);
               }
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
   
   // Aktualizace UI
   updateUI();
   
   // Zavření modálního okna
   closeModal('slepice-modal');
}

// Úprava celé skupiny slepic
function saveGroupEdit() {
    const groupDate = document.getElementById('group-date').value;
    const groupDruh = document.getElementById('group-druh').value;
    const groupBarvaKrouzku = document.getElementById('group-barvaKrouzku').value;
    const groupPorizovaci_cena = document.getElementById('group-porizovaci_cena').value;
    
    // Validace
    let isValid = true;
    
    if (!groupDruh.trim()) {
        document.getElementById('group-druh').classList.add('error');
        document.getElementById('group-druh-error').textContent = 'Zadejte druh slepice';
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Najdeme všechny slepice v této skupině
    const groupIndices = slepice.reduce((indices, s, index) => {
        if (s.datumZakoupeni === groupDate) {
            indices.push(index);
        }
        return indices;
    }, []);
    
    // Aktualizace všech slepic ve skupině
    groupIndices.forEach(index => {
        slepice[index].druh = groupDruh;
        
        // Aktualizace barvy kroužku, pokud byla zadána
        if (groupBarvaKrouzku) {
            slepice[index].barvaKrouzku = groupBarvaKrouzku;
        }
        
        // Aktualizace pořizovací ceny, pokud byla zadána
        if (groupPorizovaci_cena) {
            slepice[index].porizovaci_cena = parseInt(groupPorizovaci_cena);
        }
    });
    
    // Uložení dat
    saveData();
    
    // Aktualizace UI
    updateUI();
    
    // Zavření modálního okna
    closeModal('group-edit-modal');
}

// Smazání celé skupiny slepic
function deleteGroup(date) {
    // Filtrujeme slepice, které nejsou v této skupině
    slepice = slepice.filter(s => s.datumZakoupeni !== date);
    
    // Uložení dat
    saveData();
    
    // Aktualizace UI
    updateUI();
    
    // Zavření modálního okna
    closeModal('group-delete-modal');
}

// Odstranění slepice
function deleteSlepice(id) {
   const index = slepice.findIndex(s => s.id === id);
   if (index !== -1) {
       slepice.splice(index, 1);
       
       // Uložení dat
       saveData();
       
       // Aktualizace UI
       updateUI();
   }
   
   // Zavření modálního okna
   closeModal('delete-modal');
}

// Event listenery
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, initializing app");
    
    // Nejprve načteme lokální data a zobrazíme je
    loadData();
    updateUI();
    
    // Nastavíme správný výchozí zobrazení
    document.getElementById('main-view').style.display = 'block';
    document.getElementById('detail-view').style.display = 'none';
    
    // Přidání event listeneru pro přepínání pohledů
    const folderCard = document.getElementById('folder-card');
    if (folderCard) {
        folderCard.addEventListener('click', function() {
            console.log("Kliknuto na složku");
            document.getElementById('main-view').style.display = 'none';
            document.getElementById('detail-view').style.display = 'block';
        });
    }
    
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', function() {
            console.log("Kliknuto na zpět");
            document.getElementById('main-view').style.display = 'block';
            document.getElementById('detail-view').style.display = 'none';
        });
    }
    
    // Přidání event listeneru pro přihlášení
    const loginBtn = document.getElementById('google-login-btn');
    if (loginBtn) {
        console.log("Tlačítko pro přihlášení nalezeno");
        loginBtn.addEventListener('click', function() {
            console.log("Kliknuto na přihlášení");
            signInWithGoogle();
        });
    }
    
    // Přidání event listeneru pro odhlášení
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
    }
    
    // Přidání event listeneru pro tlačítko přidat slepici
    const addSlepiceBtn = document.getElementById('add-slepice-btn');
    if (addSlepiceBtn) {
        addSlepiceBtn.addEventListener('click', function() {
            console.log("Kliknuto na přidat slepici");
            openAddModal();
        });
    }
    
    // Událost změny data úmrtí
    const datumUmrtiInput = document.getElementById('datumUmrti');
    if (datumUmrtiInput) {
        datumUmrtiInput.addEventListener('change', calculateStariPriUmrti);
    }
    
    // Události změny datumu zakoupení a stáří
    const datumZakoupeniInput = document.getElementById('datumZakoupeni');
    const stariPriZakoupeniInput = document.getElementById('stariPriZakoupeni');
    
    if (datumZakoupeniInput) {
        datumZakoupeniInput.addEventListener('change', function() {
            if (datumUmrtiInput && datumUmrtiInput.value) {
                calculateStariPriUmrti();
            }
        });
    }
    
    if (stariPriZakoupeniInput) {
        stariPriZakoupeniInput.addEventListener('change', function() {
            if (datumUmrtiInput && datumUmrtiInput.value) {
                calculateStariPriUmrti();
            }
        });
    }
    
    // Přepínač typu kroužku
    const typKrouzkuRadios = document.querySelectorAll('input[name="typ-krouzku"]');
    if (typKrouzkuRadios.length > 0) {
        typKrouzkuRadios.forEach(radio => {
            radio.addEventListener('change', toggleKrouzekTyp);
        });
    }
    
    // Přepínač hromadného přidání
    const hromadnePridaniCheck = document.getElementById('hromadne-pridani');
    if (hromadnePridaniCheck) {
        hromadnePridaniCheck.addEventListener('change', toggleHromadnePridani);
    }
    
    // Inicializace dropdown pro čísla kroužků
    populateCislaKrouzku();
    
    // Inicializace našeptávače druhů
    updateDruhyDatalist();
    
    // Vyhledávání
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = searchInput.value.trim();
            const filteredSlepice = searchSlepice(query);
            const filteredGroups = groupSlepiceByDate(filteredSlepice);
            renderSlepiceGroups(filteredGroups);
        });
    }
    
    // Zavření modálních oken
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modalBackdrop = this.closest('.modal-backdrop');
            if (modalBackdrop) {
                closeModal(modalBackdrop.id);
            }
        });
    });
    
    const modalCancelButtons = document.querySelectorAll('[id$="-cancel"]');
    modalCancelButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = btn.id.replace('-cancel', '-modal');
            closeModal(modalId);
        });
    });
    
    // Uložení formuláře
    const modalSave = document.getElementById('modal-save');
    if (modalSave) {
        modalSave.addEventListener('click', saveForm);
    }
    
    // Uložení úpravy skupiny
    const groupEditSave = document.getElementById('group-edit-save');
    if (groupEditSave) {
        groupEditSave.addEventListener('click', saveGroupEdit);
    }
    
    // Potvrzení odstranění
    const deleteConfirm = document.getElementById('delete-confirm');
    if (deleteConfirm) {
        deleteConfirm.addEventListener('click', function() {
            const id = parseInt(deleteConfirm.dataset.id);
            deleteSlepice(id);
        });
    }
    
    // Potvrzení odstranění skupiny
    const groupDeleteConfirm = document.getElementById('group-delete-confirm');
    if (groupDeleteConfirm) {
        groupDeleteConfirm.addEventListener('click', function() {
            const date = groupDeleteConfirm.dataset.date;
            deleteGroup(date);
        });
    }
    
    // Inicializace Firebase
    try {
        initFirebase();
    } catch (error) {
        console.error("Chyba při inicializaci Firebase:", error);
        if (document.getElementById('firebase-status')) {
            document.getElementById('firebase-status').style.display = 'block';
        }
    }
    
    console.log("App initialization completed");
});// Globální proměnné pro Firebase
let auth, db, currentUser;

// Globální proměnná pro data
let slepice = [];

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
                    updateUI();
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
                // onAuthStateChanged se postará o aktualizaci UI
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
            // onAuthStateChanged se postará o aktualizaci UI
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
                
                // Uložení do localStorage jako záloha
                localStorage.setItem('slepice-data', JSON.stringify(slepice));
                
                // Aktualizace UI
                updateUI();
            } else {
                console.log("Žádná data v Firestore, použijeme lokální data");
                // Pokud uživatel nemá data v cloudu, použijeme lokální, pokud existují
                loadData();
                if (slepice.length > 0) {
                    // Uložíme lokální data do cloudu
                    saveUserData();
                }
                
                updateUI();
            }
        })
        .catch((error) => {
            console.error("Chyba při načítání dat z Firestore:", error);
            // Záložní načtení z localStorage
            loadData();
            updateUI();
        });
}

// Uložení dat uživatele do Firebase
function saveUserData() {
    if (!currentUser || !db) {
        console.error("Nelze uložit data - uživatel nebo databáze nejsou k dispozici");
        return;
    }
    
    console.log("Ukládání dat do Firestore pro uživatele:", currentUser.uid);
    
    // Přístup po jednotlivých dokumentech pro větší spolehlivost
    const promises = slepice.map(s => {
        return db.collection('users').doc(currentUser.uid).collection('slepice').doc(s.id.toString())
            .set(s)
            .then(() => {
                console.log(`Slepice ID ${s.id} úspěšně uložena`);
            })
            .catch(error => {
                console.error(`Chyba při ukládání slepice ID ${s.id}:`, error);
            });
    });
    
    Promise.all(promises)
        .then(() => {
            console.log("Všechna data úspěšně uložena do Firestore");
        })
        .catch((error) => {
            console.error("Chyba při ukládání dat do Firestore:", error);
        });
}

// Načtení dat z localStorage při startu
function loadData() {
    const savedData = localStorage.getItem('slepice-data');
    if (savedData) {
        try {
            slepice = JSON.parse(savedData);
            console.log("Data načtena z localStorage, počet záznamů:", slepice.length);
        } catch (e) {
            console.error('Chyba při načítání dat z localStorage:', e);
            // Pokud dojde k chybě, použijeme výchozí data
            initDefaultData();
        }
    } else {
        console.log("Žádná data v localStorage, použijeme výchozí data");
        initDefaultData();
    }
}

// Inicializace výchozích dat
function initDefaultData() {
    slepice = [
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
}

// Uložení dat do localStorage
function saveData() {
    // Uložení do localStorage
    localStorage.setItem('slepice-data', JSON.stringify(slepice));
    console.log("Data uložena do localStorage, počet záznamů:", slepice.length);
    
    // Pokud je uživatel přihlášen, uložíme data i do cloudu
    if (currentUser) {
        saveUserData();
    }
}

// Aktualizace celého UI
function updateUI() {
    // Aktualizace pohledu složek
    updateFolderView();
    
    // Aktualizace detailního pohledu
    const groups = groupSlepiceByDate(slepice);
    renderSlepiceGroups(groups);
    
    // Aktualizace statistik
    updateStats();
}

// Aktualizace statistik na hlavní stránce (v složce)
function updateFolderView() {
    const activeSlepice = slepice.filter(s => !s.datumUmrti);
    const historicalSlepice = slepice.filter(s => s.datumUmrti);
    
    document.getElementById('stat-live-folder').textContent = activeSlepice.length;
    document.getElementById('stat-dead-folder').textContent = historicalSlepice.length;
}

// Aktualizace statistik v detailním pohledu
function updateStats() {
    const activeSlepice = slepice.filter(s => !s.datumUmrti);
    const historicalSlepice = slepice.filter(s => s.datumUmrti);
    const totalInvestment = slepice.reduce((sum, s) => sum + (parseInt(s.porizovaci_cena) || 0), 0);
    
    document.getElementById('stat-total').textContent = activeSlepice.length;
    document.getElementById('stat-investment').textContent = `${totalInvestment.toLocaleString()} Kč`;
    document.getElementById('stat-historical').textContent = historicalSlepice.length;
}

// Formátování data
function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ');
}

// Formátování stáří v týdnech/měsících/letech
function formatAge(weeks) {
    if (!weeks) return "-";
    
    weeks = parseInt(weeks);
    
    if (weeks < 26) {
        // Méně než 6 měsíců - zobrazit v týdnech
        return `${weeks} týdnů`;
    } else if (weeks < 52) {
        // 6-12 měsíců - zobrazit v měsících
        const months = Math.floor(weeks / 4.33);
        return `${months} měsíců`;
    } else {
        // Více než rok - zobrazit v letech a měsících
        const years = Math.floor(weeks / 52);
        const remainingWeeks = weeks % 52;
        const months = Math.floor(remainingWeeks / 4.33);
        
        if (months === 0) {
            return years === 1 ? `1 rok` : `${years} let`;
        } else {
            return years === 1 
                ? `1 rok ${months} ${getMonthWord(months)}` 
                : `${years} let ${months} ${getMonthWord(months)}`;
        }
    }
}

// Pomocná funkce pro skloňování slova "měsíc"
function getMonthWord(months) {
    if (months === 1) return "měsíc";
    if (months >= 2 && months <= 4) return "měsíce";
    return "měsíců";
}

// Výpočet aktuálního stáří slepice (pro živé slepice)
function calculateCurrentAge(slepice) {
    const datumZakoupeni = new Date(slepice.datumZakoupeni);
    const stariPriZakoupeni = parseInt(slepice.stariPriZakoupeni);
    
    // Výpočet rozdílu v týdnech mezi datem zakoupení a dnešním datem
    const today = new Date();
    const rozdilDny = Math.floor((today - datumZakoupeni) / (1000 * 60 * 60 * 24));
    const rozdilTydny = Math.floor(rozdilDny / 7);
    
    // Aktuální stáří = stáří při zakoupení + počet týdnů od zakoupení
    return stariPriZakoupeni + rozdilTydny;
}

// Získání statusu skupiny podle poměru živých slepic
function getGroupStatusClass(zive, total) {
    // Zjistíme poměr živých slepic
    const ratio = zive / total;
    
    if (ratio === 1) {
        return "tag-green"; // Všechny žijí
    } else if (ratio >= 0.5) {
        return "tag-yellow"; // 50% a více žije
    } else {
        return "tag-red"; // Méně než 50% žije
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
        
        // Výpočet průměrného stáří slepic ve skupině
        const prumerneStari = slepiceGroup.reduce((sum, s) => {
            // Pro zemřelé slepice použijeme stáří při úmrtí
            if (s.datumUmrti && s.stariPriUmrti) {
                return sum + parseInt(s.stariPriUmrti);
            } 
            // Pro živé slepice vypočítáme aktuální stáří
            else {
                return sum + calculateCurrentAge(s);
            }
        }, 0) / slepiceGroup.length;
        
        return {
            datum: datum,
            slepice: slepiceGroup,
            pocet: slepiceGroup.length,
            zive: zive,
            celkovaCena: celkovaCena,
            druhy: druhy.join(", "),
            barvy: barvy.join(", "),
            rozsahCisel: rozsahCisel,
            strany: stranyText,
            prumerneStari: Math.round(prumerneStari)
        };
    }).sort((a, b) => new Date(b.datum) - new Date(a.datum)); // Seřazení od nejnovějších
}

// Funkce pro zobrazení skupin na hlavní stránce
function renderSlepiceGroups(groups) {
    const slepiceTableBody = document.getElementById('slepice-table-body');
    slepiceTableBody.innerHTML = '';
    
    if (groups.length === 0) {
        slepiceTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <svg class="chicken-icon" viewBox="0 0 600 800" fill="none" style="width: 100px; height: 100px; opacity: 0.3; margin-bottom: 20px;">
                            <path d="M336.5 107.5C336.5 107.5 311 30 371.5 11.5C432 -7 441.5 74 441.5 74C441.5 74 458.5 83 448.5 103C438.5 123 412 131.5 412 131.5" stroke="white" stroke-width="12"/>
                            <path d="M382.5 267.5C382.5 267.5 356.5 278.5 352 303C347.5 327.5 357 340 357 340" stroke="white" stroke-width="12"/>
                            <ellipse cx="373" cy="219.5" rx="25" ry="40" fill="white" stroke="white" stroke-width="12"/>
                            <ellipse cx="371" cy="219.5" rx="12" ry="16.5" fill="white"/>
                            <ellipse cx="491" cy="219.5" rx="25" ry="40" fill="white" stroke="white" stroke-width="12"/>
                            <ellipse cx="489" cy="219.5" rx="12" ry="16.5" fill="white"/>
                            <path d="M429 315.5L450 339" stroke="white" stroke-width="12"/>
                            <path d="M379 344C379 344 385 354.5 431.5 354.5C478 354.5 484 344 484 344" stroke="white" stroke-width="12"/>
                            <path d="M223.5 421.5C223.5 421.5 204 310 281 251.5C358 193 486 193 486 193C486 193 551.5 204 551.5 287.5C551.5 371 471 432 471 432" stroke="white" stroke-width="12"/>
                            <path d="M223.5 421.5C223.5 421.5 190 479 278 550.5C366 622 471 432 471 432" stroke="white" stroke-width="12"/>
                            <path d="M278 550.5C278 550.5 308 622 345.5 724C383 826 360 833 360 833" stroke="white" stroke-width="12"/>
                            <path d="M345.5 724C345.5 724 366 749 409 749C452 749 471 724 471 724" stroke="white" stroke-width="12"/>
                            <path d="M471 724C471 724 496 649 471 546.5C446 444 471 432 471 432" stroke="white" stroke-width="12"/>
                            <path d="M360 833C360 833 324 864 346.5 864C369 864 383 830 383 830" stroke="white" stroke-width="12"/>
                            <path d="M417 833C417 833 453 864 430.5 864C408 864 394 830 394 830" stroke="white" stroke-width="12"/>
                        </svg>
                        <p>Zatím nemáte žádné záznamy</p>
                        <button class="add-btn" style="margin-top: 20px;" id="empty-add-btn">
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
        
        // Určení statusu skupiny
        const statusClass = getGroupStatusClass(group.zive, group.pocet);
        
        // Zobrazení barev kroužků
        let colorDots = '';
        if (group.barvy) {
            const barvy = group.barvy.split(', ');
            barvy.forEach(barva => {
                const colorClass = getColorDotClass(barva);
                colorDots += `<span class="color-dot ${colorClass}"></span>`;
            });
        }
        
        row.innerHTML = `
            <td>
                <div class="group-name">
                    <button class="btn-toggle">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    ${group.druhy}
                </div>
            </td>
            <td>${formatDate(group.datum)}</td>
            <td>${formatAge(group.prumerneStari)}</td>
            <td><span class="tag ${statusClass}">${group.pocet} (${group.zive} živých)</span></td>
            <td>${group.celkovaCena.toLocaleString()} Kč</td>
            <td>${colorDots}${group.barvy || "-"}</td>
            <td class="group-actions">
                <button class="icon-btn" title="Upravit skupinu" data-action="edit-group" data-date="${group.datum}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete" title="Smazat skupinu" data-action="delete-group" data-date="${group.datum}">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="icon-btn" title="Přidat do skupiny" data-action="add-to-group" data-date="${group.datum}">
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
    
    // Event listenery pro akce skupiny
    document.querySelectorAll('[data-action="edit-group"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openGroupEditModal(date);
        });
    });
    
    document.querySelectorAll('[data-action="delete-group"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openGroupDeleteModal(date);
        });
    });
    
    document.querySelectorAll('[data-action="add-to-group"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const date = this.dataset.date;
            openAddModal(date);
        });
    });
}

// Získání třídy barvy kroužku
function getColorDotClass(barva) {
    if (!barva) return '';
    
    switch (barva.toLowerCase()) {
        case 'červená': return 'dot-red';
        case 'zelená': return 'dot-green';
        case 'žlutá': return 'dot-yellow';
        case 'modrá': return 'dot-blue';
        default: return '';
    }
}

// Zobrazení detailů skupiny
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
            const colorDotClass = getColorDotClass(barva);
            const colorDot = barva ? `<span class="color-dot ${colorDotClass}"></span>` : '';
            krouzekInfo = `${colorDot}č. ${slepice.cisloKrouzku}`;
        } else if (slepice.stranaKrouzku) {
            const barva = slepice.barvaKrouzku || '';
            const colorDotClass = getColorDotClass(barva);
            const colorDot = barva ? `<span class="color-dot ${colorDotClass}"></span>` : '';
            krouzekInfo = `${colorDot}${slepice.stranaKrouzku} strana`;
        }
        
        // Aktuální stáří pro živé slepice nebo stáří při úmrtí pro zemřelé
        let vekText;
        if (slepice.datumUmrti) {
            vekText = formatAge(slepice.stariPriUmrti);
        } else {
            const aktualniStari = calculateCurrentAge(slepice);
            vekText = formatAge(aktualniStari);
        }
        
        // Status
        const statusHtml = slepice.datumUmrti 
            ? `<span class="status status-deceased">Zemřela</span>` 
            : `<span class="status status-active">Žije</span>`;
        
        row.innerHTML = `
            <td>${slepice.druh}</td>
            <td>${formatAge(slepice.stariPriZakoupeni)}</td>
            <td>
                ${slepice.datumUmrti 
                    ? `${formatDate(slepice.datumUmrti)}<div>${vekText}</div>` 
                    : statusHtml + `<div>${vekText}</div>`
                }
            </td>
            <td>${krouzekInfo}</td>
            <td>${slepice.porizovaci_cena ? `${parseInt(slepice.porizovaci_cena).toLocaleString()}
