// ==========================================
// MEIN WOCHENBUDGET
// ==========================================

// Standardwerte
const STANDARD_BUDGET = 50.00;
const DATEN_VERSION = 5;

let daten = {
    datenVersion: DATEN_VERSION,
    budget: STANDARD_BUDGET,
    wochenBudget: STANDARD_BUDGET,
    uebertrag: 0,
    ausgaben: [],
    wochenHistorie: []
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

            if (Array.isArray(geladen.wochenHistorie)) {
                daten.wochenHistorie = geladen.wochenHistorie;
            }

            if (typeof geladen.wochenBudget === "number") {
                daten.wochenBudget = geladen.wochenBudget;
                daten.uebertrag = typeof geladen.uebertrag === "number"
                    ? geladen.uebertrag
                    : 0;
            } else {
                // Ältere Daten speichern noch kein separates Wochenbudget.
                const letzteWoche = daten.wochenHistorie[0];
                const alterUebertrag = letzteWoche && typeof letzteWoche.uebertrag === "number"
                    ? letzteWoche.uebertrag
                    : 0;

                if (letzteWoche && typeof letzteWoche.budget === "number") {
                    daten.uebertrag = alterUebertrag;
                    daten.wochenBudget = daten.budget === alterUebertrag
                        ? letzteWoche.budget
                        : daten.budget;
                    daten.budget = daten.wochenBudget + daten.uebertrag;
                } else {
                    daten.wochenBudget = daten.budget;
                    daten.uebertrag = 0;
                }
            }

            // Beim Update den früheren Standardwert einmalig auf 50 € anheben.
            // Ausgaben, Verlauf und ein vorhandener Übertrag bleiben erhalten.
            if (geladen.datenVersion !== DATEN_VERSION) {
                if (daten.wochenBudget === 40) {
                    daten.wochenBudget = STANDARD_BUDGET;
                    daten.budget = STANDARD_BUDGET + daten.uebertrag;
                }

                // Ohne abgeschlossene Woche kann kein Übertrag übrig bleiben.
                // Das bereinigt alte Einträge, die vor der Budgetkorrektur gelöscht wurden.
                if (daten.wochenHistorie.length === 0 && daten.uebertrag !== 0) {
                    daten.uebertrag = 0;
                    daten.budget = daten.wochenBudget;
                }

                daten.datenVersion = DATEN_VERSION;
                datenSpeichern();
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
        euro(daten.wochenBudget);

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
    wochenHistorieAnzeigen();
}


// ==========================================
// WOCHENÜBERSICHT
// ==========================================

function wochenHistorieAnzeigen() {
    const liste = document.getElementById("wochenListe");
    liste.innerHTML = "";
    document.getElementById("anzahlWochen").textContent =
        daten.wochenHistorie.length;

    if (daten.wochenHistorie.length === 0) {
        const leer = document.createElement("div");
        leer.className = "empty";
        leer.textContent = "Abgeschlossene Wochen erscheinen hier.";
        liste.appendChild(leer);
        return;
    }

    daten.wochenHistorie.forEach(woche => {
        const eintrag = document.createElement("details");
        eintrag.className = "week-history-item";

        const titel = document.createElement("summary");
        titel.textContent = `Abgeschlossen am ${datumFuerAnzeige(woche.abgeschlossenAm)}`;
        eintrag.appendChild(titel);

        const controls = document.createElement("div");
        controls.className = "week-history-controls";

        const summen = document.createElement("div");
        summen.className = "week-history-totals";
        summen.textContent = `Startbudget: ${euro(woche.budget)} · Ausgegeben: ${euro(woche.ausgegeben)} · Übertrag (+/−): ${euro(woche.uebertrag)} · Nächste Woche: ${euro(woche.naechstesBudget ?? woche.uebertrag)}`;
        controls.appendChild(summen);

        const loeschenButton = document.createElement("button");
        loeschenButton.type = "button";
        loeschenButton.className = "delete-week-button";
        loeschenButton.textContent = "Löschen";
        loeschenButton.setAttribute("aria-label", `Woche vom ${datumFuerAnzeige(woche.abgeschlossenAm)} löschen`);
        loeschenButton.addEventListener("click", event => {
            event.stopPropagation();
            if (!confirm(
                `Möchtest du die Woche vom ${datumFuerAnzeige(woche.abgeschlossenAm)} mit ihren Ausgaben aus der Übersicht löschen? ` +
                "Das aktuelle Budget wird anhand der verbleibenden Wochen neu berechnet."
            )) {
                return;
            }

            const index = daten.wochenHistorie.indexOf(woche);
            if (index === -1) {
                return;
            }

            daten.wochenHistorie.splice(index, 1);
            wochenHistorieNeuBerechnen();
            datenSpeichern();
            anzeigeAktualisieren();
        });
        controls.appendChild(loeschenButton);
        eintrag.appendChild(controls);

        const ausgaben = document.createElement("div");
        ausgaben.className = "week-history-expenses";
        (woche.ausgaben || []).forEach(ausgabe => {
            const zeile = document.createElement("div");
            zeile.className = "week-history-expense";
            const beschreibung = document.createElement("span");
            beschreibung.textContent = `${ausgabe.beschreibung} · ${datumFuerAnzeige(ausgabe.datum)}`;
            const betrag = document.createElement("strong");
            betrag.textContent = euro(ausgabe.betrag);
            zeile.append(beschreibung, betrag);
            ausgaben.appendChild(zeile);
        });
        if (!woche.ausgaben || woche.ausgaben.length === 0) {
            ausgaben.textContent = "Keine Ausgaben in dieser Woche.";
        }
        eintrag.appendChild(ausgaben);
        liste.appendChild(eintrag);
    });
}


function wochenHistorieNeuBerechnen() {
    let uebertragAusVorwoche = 0;

    // Die Historie ist neueste Woche zuerst gespeichert, daher rückwärts rechnen.
    for (let i = daten.wochenHistorie.length - 1; i >= 0; i--) {
        const woche = daten.wochenHistorie[i];
        const wochenBudget = typeof woche.wochenBudget === "number"
            ? woche.wochenBudget
            : typeof woche.budget === "number"
                ? woche.budget - uebertragAusVorwoche
                : daten.wochenBudget;
        const ausgegeben = typeof woche.ausgegeben === "number"
            ? woche.ausgegeben
            : (woche.ausgaben || []).reduce(
                (summe, ausgabe) => summe + (ausgabe.betrag || 0),
                0
            );

        woche.wochenBudget = wochenBudget;
        woche.budget = wochenBudget + uebertragAusVorwoche;
        woche.ausgegeben = ausgegeben;
        woche.uebertrag = woche.budget - ausgegeben;
        woche.naechstesBudget = wochenBudget + woche.uebertrag;
        uebertragAusVorwoche = woche.uebertrag;
    }

    daten.uebertrag = uebertragAusVorwoche;
    daten.budget = daten.wochenBudget + uebertragAusVorwoche;
}


function wochenabschlussAnzeigen(woche) {
    const text = document.getElementById("weekSummaryText");
    text.textContent = `Startbudget: ${euro(woche.budget)} · Ausgegeben: ${euro(woche.ausgegeben)} · Übertrag (+/−): ${euro(woche.uebertrag)}. Das Wochenbudget von ${euro(woche.wochenBudget)} wird mit diesem Übertrag verrechnet. Das neue Startbudget beträgt ${euro(woche.naechstesBudget)}.`;

    const liste = document.getElementById("weekSummaryExpenses");
    liste.innerHTML = "";
    if (woche.ausgaben.length === 0) {
        liste.textContent = "Keine Ausgaben in dieser Woche.";
    } else {
        woche.ausgaben.forEach(ausgabe => {
            const zeile = document.createElement("div");
            zeile.className = "week-summary-expense";
            const beschreibung = document.createElement("span");
            beschreibung.textContent = `${ausgabe.beschreibung} · ${datumFuerAnzeige(ausgabe.datum)}`;
            const betrag = document.createElement("strong");
            betrag.textContent = euro(ausgabe.betrag);
            zeile.append(beschreibung, betrag);
            liste.appendChild(zeile);
        });
    }

    document.getElementById("weekSummaryModal").classList.remove("hidden");
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
        daten.wochenBudget.toFixed(2).replace(".", ",");

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

    daten.wochenBudget = neuesBudget;
    daten.budget = neuesBudget + daten.uebertrag;
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
        "Die bisherige Woche wird archiviert. " +
        "Ein positiver Rest wird addiert; ein Fehlbetrag wird abgezogen."
    );

    if (!bestaetigt) {
        return;
    }

    const werte = berechnung();
    const abgeschlosseneWoche = {
        id: Date.now(),
        abgeschlossenAm: heutigesDatum(),
        budget: daten.budget,
        wochenBudget: daten.wochenBudget,
        ausgegeben: werte.ausgegeben,
        // Ein positiver Saldo wird addiert, ein negativer Saldo abgezogen.
        uebertrag: werte.verfuegbar,
        naechstesBudget: daten.wochenBudget + werte.verfuegbar,
        ausgaben: daten.ausgaben.map(ausgabe => ({ ...ausgabe }))
    };

    daten.wochenHistorie.unshift(abgeschlosseneWoche);
    daten.uebertrag = abgeschlosseneWoche.uebertrag;
    daten.budget = abgeschlosseneWoche.naechstesBudget;
    daten.ausgaben = [];
    ausgewaehlteAusgabe = null;

    datenSpeichern();
    anzeigeAktualisieren();
    wochenabschlussAnzeigen(abgeschlosseneWoche);
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

document
    .getElementById("closeWeekSummary")
    .addEventListener("click", () => {
        document.getElementById("weekSummaryModal").classList.add("hidden");
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

document
    .getElementById("weekSummaryModal")
    .addEventListener("click", event => {
        if (event.target.id === "weekSummaryModal") {
            event.currentTarget.classList.add("hidden");
        }
    });


// ==========================================
// START
// ==========================================

datenLaden();

// Ohne abgeschlossene Woche kann kein gültiger Übertrag existieren.
// Alte oder zuvor gelöschte Verlaufsdaten dürfen das aktuelle Budget nicht verfälschen.
if (daten.wochenHistorie.length === 0 && (daten.uebertrag !== 0 || daten.budget !== daten.wochenBudget)) {
    daten.uebertrag = 0;
    daten.budget = daten.wochenBudget;
    datenSpeichern();
}

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
