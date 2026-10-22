/* Zum Kapellenhof – Entwurf. Die Tafel beschriftet sich selbst nach den Öffnungszeiten des Aushangs:
   Sommer (1. Mai bis 1. November): Fr 19–1, Sa 16–1, So 10–19
   Winter (1. November bis 1. Mai): Fr 19–1, Sa 18–1, So 10–14
   Letzter Samstag im Monat geschlossen, Mo–Do geschlossen. */
(function () {
  "use strict";

  var TAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  var KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  var MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  function tagStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function plusTage(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function istSommer(d) { var m = d.getMonth(); return m >= 4 && m <= 9; }
  function istLetzterSamstag(d) { return d.getDay() === 6 && plusTage(d, 7).getMonth() !== d.getMonth(); }
  function datumKurz(d) { return KURZ[d.getDay()] + " " + ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "."; }

  /* Öffnung eines Kalendertags: {von, bis} in Stunden (bis 25 = ca. 1 Uhr nachts) oder {zu: Grund} oder null */
  function oeffnung(d) {
    var t = d.getDay(), sommer = istSommer(d);
    if (t === 5) return { von: 19, bis: 25 };
    if (t === 6) return istLetzterSamstag(d) ? { zu: "letzter Samstag im Monat" } : { von: sommer ? 16 : 18, bis: 25 };
    if (t === 0) return { von: 10, bis: sommer ? 19 : 14, frueh: true };
    return null;
  }
  function spanne(o) { return o.von + " bis " + (o.bis >= 24 ? "ca. " + (o.bis - 24) : "ca. " + o.bis) + " Uhr"; }

  function naechsteOeffnung(ab) {
    for (var i = 0; i < 14; i++) {
      var d = plusTage(ab, i), o = oeffnung(d);
      if (o && !o.zu) return { d: d, o: o, i: i };
    }
    return null;
  }

  function zustand(jetzt) {
    var heute = tagStart(jetzt), h = jetzt.getHours() + jetzt.getMinutes() / 60;
    var gestern = plusTage(heute, -1), og = oeffnung(gestern);
    if (og && !og.zu && og.bis > 24 && h < og.bis - 24) return { offen: true, bis: og.bis, frueh: false };
    var o = oeffnung(heute);
    if (o && !o.zu) {
      if (h >= o.von && h < o.bis) return { offen: true, bis: o.bis, frueh: o.frueh };
      if (h < o.von) return { spaeter: o };
    }
    return { zu: true, grund: o && o.zu ? o.zu : (o ? "feierabend" : "ruhetag") };
  }

  /* ---------- Tafel beschriften ---------- */
  var inhalt = document.getElementById("tafelInhalt");
  var LINIE = '<svg class="kreidelinie" viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden="true"><path d="M4 8 C 90 5, 180 10, 270 6 S 380 9, 396 7"/></svg>';

  function notizLesen() {
    try { return JSON.parse(localStorage.getItem("kapellenhof-tafel") || "null"); } catch (e) { return null; }
  }
  function notizSpeichern(text) {
    try { text ? localStorage.setItem("kapellenhof-tafel", JSON.stringify({ text: text })) : localStorage.removeItem("kapellenhof-tafel"); } catch (e) {}
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function tafelHtml(jetzt) {
    var heute = tagStart(jetzt), z = zustand(jetzt), zeilen = [], notiz = notizLesen();
    zeilen.push('<p class="kz kz-klein">Heute, ' + TAGE[heute.getDay()] + ", " + heute.getDate() + ". " + MONATE[heute.getMonth()] + "</p>");

    if (notiz && notiz.text) {
      zeilen.push('<div class="kz-notiz"><p class="kz kz-gross kz-gelb">' + esc(notiz.text) + "</p></div>");
    }

    var gross, klein = "";
    if (z.offen) {
      gross = z.frueh ? "Frühschoppen!" : "Wir haben geöffnet.";
      klein = "Heute bis " + (z.bis >= 24 ? "ca. " + (z.bis - 24) : "ca. " + z.bis) + " Uhr. Kommen Sie vorbei!";
    } else if (z.spaeter) {
      gross = z.spaeter.frueh ? "Heute Frühschoppen ab " + z.spaeter.von + " Uhr" : "Heute ab " + z.spaeter.von + " Uhr geöffnet";
      klein = "bis " + (z.spaeter.bis >= 24 ? "ca. " + (z.spaeter.bis - 24) : "ca. " + z.spaeter.bis) + " Uhr";
    } else {
      var n = naechsteOeffnung(plusTage(heute, 1));
      if (z.grund === "letzter Samstag im Monat") gross = "Heute geschlossen.";
      else if (z.grund === "feierabend") gross = "Für heute ist Feierabend.";
      else gross = "Heute Ruhetag.";
      if (n) {
        var wann = n.i === 0 ? "Morgen" : TAGE[n.d.getDay()];
        klein = (z.grund === "letzter Samstag im Monat" ? "Letzter Samstag im Monat. " : "") + wann + " ab " + n.o.von + " Uhr " + (n.o.frueh ? "Frühschoppen." : "sind wir wieder da.");
      }
    }
    if (!(notiz && notiz.text)) {
      zeilen.push('<p class="kz kz-gross">' + gross + "</p>");
      if (klein) zeilen.push('<p class="kz">' + klein + "</p>");
    }

    zeilen.push(LINIE);

    // die nächsten drei Tage mit Ausschank (Fr, Sa, So), ab heute
    var gezeigt = 0, zuGezeigt = false;
    for (var i = 0; i < 10 && gezeigt < 3; i++) {
      var d = plusTage(heute, i), o = oeffnung(d);
      if (!o) continue;
      gezeigt++;
      if (o.zu) {
        zuGezeigt = true;
        zeilen.push('<p class="kz kz-zeile kz-zu"><span class="tag">' + datumKurz(d).slice(0, 2) + '</span><span>' + datumKurz(d).slice(3) + "</span><span>geschlossen</span></p>");
      } else {
        zeilen.push('<p class="kz kz-zeile"><span class="tag">' + datumKurz(d).slice(0, 2) + '</span><span>' + datumKurz(d).slice(3) + "</span><span>" + (o.frueh ? "Frühschoppen " : "") + spanne(o) + "</span></p>");
      }
    }

    // Hinweise: kommender letzter Samstag, Saisonwechsel
    var hinweise = [];
    if (!zuGezeigt) {
      for (var k = 0; k < 15; k++) {
        var s = plusTage(heute, k);
        if (istLetzterSamstag(s)) { hinweise.push("Sa " + datumKurz(s).slice(3) + " geschlossen (letzter Samstag im Monat)"); break; }
      }
    }
    for (var w = 1; w <= 21; w++) {
      var x = plusTage(heute, w);
      if (x.getDate() === 1 && (x.getMonth() === 10 || x.getMonth() === 4)) {
        hinweise.push(x.getMonth() === 10 ? "Ab 1. November gelten unsere Winterzeiten." : "Ab 1. Mai gelten unsere Sommerzeiten.");
        break;
      }
    }
    hinweise.forEach(function (t) { zeilen.push('<p class="kz kz-hinweis kz-gelb">' + t + "</p>"); });

    zeilen.push(LINIE);
    zeilen.push('<p class="kz kz-hinweis">Gruppen und Vereine: gern auch nach Absprache.</p>');
    return zeilen.join("");
  }

  function anschreiben() {
    if (!inhalt) return;
    inhalt.innerHTML = tafelHtml(new Date());
    var teile = inhalt.querySelectorAll(".kz, .kreidelinie");
    for (var i = 0; i < teile.length; i++) teile[i].style.setProperty("--i", i);
    inhalt.classList.remove("wischt");
    inhalt.classList.remove("schreibt");
    void inhalt.offsetWidth;
    inhalt.classList.add("schreibt");
  }
  function tafelZeigen() {
    var t = document.querySelector(".tafel"), r = t.getBoundingClientRect();
    if (r.top < 70 || r.top > window.innerHeight * .5) t.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function wischenUndSchreiben() {
    if (!inhalt) return;
    var reduziert = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduziert) { anschreiben(); tafelZeigen(); return; }
    tafelZeigen();
    inhalt.classList.add("wischt");
    setTimeout(anschreiben, 430);
  }

  anschreiben();

  // Saison in der Öffnungszeiten-Box markieren
  var aktiv = document.getElementById(istSommer(new Date()) ? "sommer" : "winter");
  if (aktiv) {
    aktiv.classList.add("jetzt");
    var t = aktiv.querySelector(".saison-titel");
    if (t) t.insertAdjacentHTML("beforeend", " <em>jetzt</em>");
  }

  /* ---------- Demo: selbst an die Tafel schreiben ---------- */
  var auf = document.getElementById("kreideAuf"), panel = document.getElementById("kreidePanel"), feld = document.getElementById("kreideText");
  if (auf && panel) {
    auf.addEventListener("click", function () {
      var offen = panel.hidden;
      panel.hidden = !offen;
      auf.setAttribute("aria-expanded", String(offen));
    });
    panel.querySelectorAll(".kp-vorlagen button").forEach(function (b) {
      b.addEventListener("click", function () {
        feld.value = b.getAttribute("data-text");
        panel.querySelectorAll(".kp-vorlagen button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        notizSpeichern(feld.value.trim());
        wischenUndSchreiben();
      });
    });
    document.getElementById("kreideSchreiben").addEventListener("click", function () {
      var v = feld.value.trim();
      if (!v) { feld.focus(); return; }
      notizSpeichern(v);
      wischenUndSchreiben();
    });
    document.getElementById("kreideWischen").addEventListener("click", function () {
      feld.value = "";
      panel.querySelectorAll(".kp-vorlagen button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      notizSpeichern("");
      wischenUndSchreiben();
    });
    var gespeichert = notizLesen();
    if (gespeichert && gespeichert.text) feld.value = gespeichert.text;
  }

  /* ---------- Feieranfrage (Entwurf: zeigt nur die Vorschau) ---------- */
  var form = document.getElementById("anfrage"), vorschau = document.getElementById("vorschau"), blase = document.getElementById("blase"), fehler = document.getElementById("formFehler");
  if (form) {
    var datumFeld = form.querySelector('input[name="datum"]');
    if (datumFeld) datumFeld.min = new Date().toISOString().slice(0, 10);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var weg = (e.submitter && e.submitter.getAttribute("data-weg")) || "WhatsApp";
      var f = new FormData(form);
      var pflicht = ["datum", "personen", "name", "telefon"];
      var fehlt = pflicht.filter(function (k) { return !String(f.get(k) || "").trim(); });
      form.querySelectorAll("input").forEach(function (i) { i.removeAttribute("aria-invalid"); });
      if (fehlt.length) {
        fehlt.forEach(function (k) { var el = form.querySelector('[name="' + k + '"]'); if (el) el.setAttribute("aria-invalid", "true"); });
        fehler.hidden = false;
        var erstes = form.querySelector('[name="' + fehlt[0] + '"]'); if (erstes) erstes.focus();
        return;
      }
      fehler.hidden = true;
      var d = new Date(f.get("datum") + "T12:00:00");
      var datum = isNaN(d) ? f.get("datum") : TAGE[d.getDay()] + ", " + d.getDate() + ". " + MONATE[d.getMonth()] + " " + d.getFullYear();
      var text = "Guten Tag Familie Meier,\nich möchte gern eine Feier im Kapellenhof anfragen.\n\n" +
        "Raum: " + f.get("raum") + "\nDatum: " + datum + "\nPersonen: " + f.get("personen") + "\nAnlass: " + f.get("anlass") +
        (String(f.get("nachricht") || "").trim() ? "\nDazu: " + String(f.get("nachricht")).trim() : "") +
        "\n\nViele Grüße\n" + f.get("name") + ", " + f.get("telefon");
      blase.textContent = (weg === "E-Mail" ? "An: service@zum-kapellenhof.de\nBetreff: Feieranfrage " + datum + "\n\n" : "") + text;
      blase.classList.toggle("mail", weg === "E-Mail");
      document.getElementById("vorschau-titel").textContent = "So käme Ihre Anfrage per " + weg + " bei Familie Meier an";
      vorschau.hidden = false;
      document.getElementById("vorschauZu").focus();
    });
    function zu() { vorschau.hidden = true; }
    document.getElementById("vorschauZu").addEventListener("click", zu);
    vorschau.addEventListener("click", function (e) { if (e.target === vorschau) zu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !vorschau.hidden) zu(); });
  }

  // Tafel um Mitternacht und zu jeder vollen Stunde neu prüfen
  setInterval(function () { if (new Date().getMinutes() === 0) anschreiben(); }, 60000);

  // für den eigenen Test: ?datum=2026-10-31T15:00
  var test = new URLSearchParams(location.search).get("datum");
  if (test && inhalt) {
    var td = new Date(test);
    if (!isNaN(td)) { inhalt.innerHTML = tafelHtml(td); }
  }
})();
