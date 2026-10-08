// ==========================================
// MEIN WOCHENBUDGET
// ==========================================

// Standardwerte
const STANDARD_BUDGET = 50.00;

let daten = {
    budget: STANDARD_BUDGET,
    ausgaben: []
};

let ausgewaehlteAusgabe = null;


// ==========================================
// DATUM-HILFSFUNKTIONEN
// ==========================================

function heutigesDatum() {
    const heute = new Date();
    const jahr = heute.getFullYear();
    const monat = String(heute.getMonth() + 1).padStart(2, "0");
    const tag = String(heute.getDate()).padStart(2, "0");

    return `${jahr}-${monat}-${tag}`;
}

function datumFuerAnzeige(datum) {
    if (!datum) {
        return "";
    }

    // Datum aus einem HTML-Datumsfeld: JJJJ-MM-TT
    if (/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
        const [jahr, monat, tag] = datum.split("-");
        return `${tag}.${monat}.${jahr}`;
    }

    // Bereits gespeichertes deutsches Datum: TT.MM.JJJJ
    return datum;
}

function datumFuerEingabefeld(datum) {
    if (!datum) {
        return heutigesDatum();
    }

    // Bereits im Format eines HTML-Datumsfelds
    if (/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
        return datum;
    }

    // Gespeichertes deutsches Datum in JJJJ-MM-TT umwandeln
    const treffer = datum.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

    if (treffer) {
        return `${treffer[3]}-${treffer[2]}-${treffer[1]}`;
    }

    return heutigesDatum();
}


// ==========================================
// DATEN LADEN
// ==========================================

function datenLaden() {
    const gespeichert = localStorage.getItem("wochenbudget_daten");

    if (gespeichert) {
        try {
            const geladen = JSON.parse(gespeichert);

            if (typeof geladen.budget === "number") {
                daten.budget = geladen.budget;
            }

            if (Array.isArray(geladen.ausgaben)) {
                daten.ausgaben = geladen.ausgaben;
            }
        } catch (fehler) {
            console.log("Gespeicherte Daten konnten nicht geladen werden.");
        }
    }
}


// ==========================================
// DATEN SPEICHERN
// ==========================================

function datenSpeichern() {
    localStorage.setItem(
        "wochenbudget_daten",
        JSON.stringify(daten)
    );
}


// ==========================================
// EURO-FORMAT
// ==========================================

function euro(betrag) {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR"
    }).format(betrag);
}


// ==========================================
// ZAHL EINGEBEN
// ==========================================

function zahlAusEingabe(wert) {
    if (!wert) {
        return NaN;
    }

    wert = wert
        .trim()
        .replace("€", "")
        .replace(/\s/g, "");

    // Deutsches Format, zum Beispiel 12,50 oder 1.250,50
    if (wert.includes(",")) {
        wert = wert
            .replace(/\./g, "")
            .replace(",", ".");
    }

    return parseFloat(wert);
}


// ==========================================
// BERECHNUNG
// ==========================================

function berechnung() {
    const ausgegeben = daten.ausgaben.reduce(
        (summe, ausgabe) => summe + ausgabe.betrag,
        0
    );

    const verfuegbar = daten.budget - ausgegeben;

    return {
        ausgegeben,
        verfuegbar
    };
}


// ==========================================
// ANZEIGE AKTUALISIEREN
// ==========================================

function anzeigeAktualisieren() {
    const werte = berechnung();

    document.getElementById("budget").textContent =
        euro(daten.budget);

    document.getElementById("ausgegeben").textContent =
        euro(werte.ausgegeben);

    document.getElementById("verfuegbar").textContent =
        euro(werte.verfuegbar);

    document.getElementById("anzahlAusgaben").textContent =
        daten.ausgaben.length;

    // Farbe / Status
    const verfuegbarElement =
        document.getElementById("verfuegbar");

    const status =
        document.getElementById("status");

    if (werte.verfuegbar < 0) {
        verfuegbarElement.style.color = "#FFD6D6";
        status.textContent =
            "⚠️ Du bist über deinem Wochenbudget.";
        status.style.color = "#D95C5C";
    } else if (werte.verfuegbar <= daten.budget * 0.2) {
        verfuegbarElement.style.color = "#FFE2A8";
        status.textContent =
            "Achtung: Dein Budget wird knapp.";
        status.style.color = "#E39A3C";
    } else {
        verfuegbarElement.style.color = "white";
        status.textContent =
            "👍 Dein Budget sieht gut aus.";
        status.style.color = "#3E9B68";
    }

    ausgabenAnzeigen();
}


// ==========================================
// AUSGABEN ANZEIGEN
// ==========================================

function ausgabenAnzeigen() {
    const liste =
        document.getElementById("ausgabenListe");

    liste.innerHTML = "";

    if (daten.ausgaben.length === 0) {
        const leer = document.createElement("div");
        leer.className = "empty";
        leer.textContent = "Noch keine Ausgaben.";
        liste.appendChild(leer);
        return;
    }

    // Neueste Ausgabe zuerst
    const sortierteAusgaben = [...daten.ausgaben]
        .sort((a, b) => b.id - a.id);

    sortierteAusgaben.forEach(ausgabe => {
        const element = document.createElement("div");
        element.className = "expense-item";

        if (ausgewaehlteAusgabe === ausgabe.id) {
            element.classList.add("selected");
        }

        const info = document.createElement("div");
        info.className = "expense-info";

        const beschreibung = document.createElement("div");
        beschreibung.className = "expense-description";
        beschreibung.textContent = ausgabe.beschreibung;

        const datum = document.createElement("div");
        datum.className = "expense-date";
        datum.textContent = datumFuerAnzeige(ausgabe.datum);

        info.appendChild(beschreibung);
        info.appendChild(datum);

        const betrag = document.createElement("div");
        betrag.className = "expense-amount";
        betrag.textContent = "-" + euro(ausgabe.betrag);

        element.appendChild(info);
        element.appendChild(betrag);

        // Ausgabe auswählen
        element.addEventListener("click", () => {
            if (ausgewaehlteAusgabe === ausgabe.id) {
                ausgewaehlteAusgabe = null;
            } else {
                ausgewaehlteAusgabe = ausgabe.id;
            }

            ausgabenAnzeigen();
        });

        liste.appendChild(element);
    });
}


// ==========================================
// AUSGABE HINZUFÜGEN
// ==========================================

function ausgabeHinzufuegen() {
    const beschreibungInput =
        document.getElementById("beschreibung");

    const betragInput =
        document.getElementById("betrag");

    const datumInput =
        document.getElementById("datum");

    const beschreibung =
        beschreibungInput.value.trim();

    const betrag =
        zahlAusEingabe(betragInput.value);

    const datum =
        datumInput.value;

    if (!beschreibung) {
        alert("Bitte gib an, wofür du Geld ausgegeben hast.");
        beschreibungInput.focus();
        return;
    }

    if (isNaN(betrag) || betrag <= 0) {
        alert("Bitte gib einen gültigen Betrag ein.");
        betragInput.focus();
        return;
    }

    if (!datum) {
        alert("Bitte wähle ein Datum aus.");
        datumInput.focus();
        return;
    }

    const neueAusgabe = {
        id: Date.now(),
        beschreibung: beschreibung,
        betrag: betrag,
        datum: datumFuerAnzeige(datum)
    };

    daten.ausgaben.push(neueAusgabe);
    datenSpeichern();

    // Eingabefelder leeren und Datum wieder auf heute setzen
    beschreibungInput.value = "";
    betragInput.value = "";
    datumInput.value = heutigesDatum();

    ausgewaehlteAusgabe = neueAusgabe.id;

    anzeigeAktualisieren();
    beschreibungInput.focus();
}


// ==========================================
// AUSGABE LÖSCHEN
// ==========================================

function ausgabeLoeschen() {
    if (ausgewaehlteAusgabe === null) {
        alert("Bitte wähle zuerst eine Ausgabe aus.");
        return;
    }

    const ausgabe = daten.ausgaben.find(
        eintrag => eintrag.id === ausgewaehlteAusgabe
    );

    if (!ausgabe) {
        return;
    }

    const bestaetigt = confirm(
        `Möchtest du "${ausgabe.beschreibung}" wirklich löschen?`
    );

    if (!bestaetigt) {
        return;
    }

    daten.ausgaben = daten.ausgaben.filter(
        eintrag => eintrag.id !== ausgewaehlteAusgabe
    );

    ausgewaehlteAusgabe = null;

    datenSpeichern();
    anzeigeAktualisieren();
}


// ==========================================
// AUSGABE BEARBEITEN
// ==========================================

function ausgabeBearbeiten() {
    if (ausgewaehlteAusgabe === null) {
        alert("Bitte wähle zuerst eine Ausgabe aus.");
        return;
    }

    const ausgabe = daten.ausgaben.find(
        eintrag => eintrag.id === ausgewaehlteAusgabe
    );

    if (!ausgabe) {
        return;
    }

    document.getElementById("editBeschreibung").value =
        ausgabe.beschreibung;

    document.getElementById("editBetrag").value =
        ausgabe.betrag.toFixed(2).replace(".", ",");

    document.getElementById("editDatum").value =
        datumFuerEingabefeld(ausgabe.datum);

    document
        .getElementById("editModal")
        .classList.remove("hidden");
}


// ==========================================
// BEARBEITUNG SPEICHERN
// ==========================================

function bearbeitungSpeichern() {
    if (ausgewaehlteAusgabe === null) {
        return;
    }

    const beschreibung =
        document.getElementById("editBeschreibung").value.trim();

    const betrag =
        zahlAusEingabe(
            document.getElementById("editBetrag").value
        );

    const datum =
        document.getElementById("editDatum").value;

    if (!beschreibung) {
        alert("Bitte gib eine Beschreibung ein.");
        return;
    }

    if (isNaN(betrag) || betrag <= 0) {
        alert("Bitte gib einen gültigen Betrag ein.");
        return;
    }

    if (!datum) {
        alert("Bitte wähle ein Datum aus.");
        document.getElementById("editDatum").focus();
        return;
    }

    const ausgabe = daten.ausgaben.find(
        eintrag => eintrag.id === ausgewaehlteAusgabe
    );

    if (!ausgabe) {
        return;
    }

    ausgabe.beschreibung = beschreibung;
    ausgabe.betrag = betrag;
    ausgabe.datum = datumFuerAnzeige(datum);

    datenSpeichern();

    document
        .getElementById("editModal")
        .classList.add("hidden");

    anzeigeAktualisieren();
}


// ==========================================
// BUDGET-MODAL ÖFFNEN
// ==========================================

function budgetModalOeffnen() {
    document.getElementById("neuesBudget").value =
        daten.budget.toFixed(2).replace(".", ",");

    document
        .getElementById("budgetModal")
        .classList.remove("hidden");

    setTimeout(() => {
        document.getElementById("neuesBudget").focus();
    }, 100);
}


// ==========================================
// BUDGET SPEICHERN
// ==========================================

function budgetSpeichern() {
    const neuesBudget =
        zahlAusEingabe(
            document.getElementById("neuesBudget").value
        );

    if (isNaN(neuesBudget) || neuesBudget <= 0) {
        alert("Bitte gib ein gültiges Budget ein.");
        return;
    }

    daten.budget = neuesBudget;
    datenSpeichern();

    document
        .getElementById("budgetModal")
        .classList.add("hidden");

    anzeigeAktualisieren();
}


// ==========================================
// NEUE WOCHE
// ==========================================

function neueWoche() {
    const bestaetigt = confirm(
        "Möchtest du wirklich eine neue Woche beginnen?\n\n" +
        "Alle bisherigen Ausgaben werden gelöscht. " +
        "Dein Budget bleibt erhalten."
    );

    if (!bestaetigt) {
        return;
    }

    daten.ausgaben = [];
    ausgewaehlteAusgabe = null;

    datenSpeichern();
    anzeigeAktualisieren();
}


// ==========================================
// EVENT LISTENER
// ==========================================

document
    .getElementById("addButton")
    .addEventListener("click", ausgabeHinzufuegen);

document
    .getElementById("deleteButton")
    .addEventListener("click", ausgabeLoeschen);

document
    .getElementById("editButton")
    .addEventListener("click", ausgabeBearbeiten);

document
    .getElementById("newWeekButton")
    .addEventListener("click", neueWoche);

document
    .getElementById("budgetButton")
    .addEventListener("click", budgetModalOeffnen);

document
    .getElementById("saveBudget")
    .addEventListener("click", budgetSpeichern);

document
    .getElementById("cancelBudget")
    .addEventListener("click", () => {
        document
            .getElementById("budgetModal")
            .classList.add("hidden");
    });

document
    .getElementById("saveEdit")
    .addEventListener("click", bearbeitungSpeichern);

document
    .getElementById("cancelEdit")
    .addEventListener("click", () => {
        document
            .getElementById("editModal")
            .classList.add("hidden");
    });


// ==========================================
// ENTER-TASTE
// ==========================================

document
    .getElementById("betrag")
    .addEventListener("keydown", event => {
        if (event.key === "Enter") {
            ausgabeHinzufuegen();
        }
    });

document
    .getElementById("beschreibung")
    .addEventListener("keydown", event => {
        if (event.key === "Enter") {
            document.getElementById("betrag").focus();
        }
    });

document
    .getElementById("neuesBudget")
    .addEventListener("keydown", event => {
        if (event.key === "Enter") {
            budgetSpeichern();
        }
    });

document
    .getElementById("editBetrag")
    .addEventListener("keydown", event => {
        if (event.key === "Enter") {
            bearbeitungSpeichern();
        }
    });


// ==========================================
// MODAL DURCH KLICK AUF HINTERGRUND SCHLIESSEN
// ==========================================

document
    .getElementById("budgetModal")
    .addEventListener("click", event => {
        if (event.target.id === "budgetModal") {
            event.currentTarget.classList.add("hidden");
        }
    });

document
    .getElementById("editModal")
    .addEventListener("click", event => {
        if (event.target.id === "editModal") {
            event.currentTarget.classList.add("hidden");
        }
    });


// ==========================================
// START
// ==========================================

datenLaden();

// Das Datumsfeld beim Start auf heute setzen
document.getElementById("datum").value = heutigesDatum();

anzeigeAktualisieren();

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(() => {
                console.log("Service Worker erfolgreich registriert.");
            })
            .catch(error => {
                console.error("Service Worker Fehler:", error);
            });
    });
}