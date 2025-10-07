// --------- POMOĆNE ---------
function generirajSlotove() {
  const slotovi = [];
  let sat = 12;
  let minuta = 0;
  // Od 12:00 do 19:00 (start u 19:00 je dopušten, trajanje 45 min)
  while (sat < 19 || (sat === 19 && minuta === 0)) {
    const vrijeme = `${String(sat).padStart(2, '0')}:${String(minuta).padStart(2, '0')}`;
    slotovi.push(vrijeme);
    minuta += 45;
    if (minuta >= 60) {
      sat++;
      minuta -= 60;
    }
  }
  return slotovi;
}

// --------- KALENDAR ---------
async function prikaziKalendar() {
  const kalendar = document.getElementById("kalendar");
  if (!kalendar) return;

  const response = await fetch("http://localhost:3000/termini");
  const termini = await response.json();

  // Set svih zauzetih slotova (potvrdjen i cekanje)
  const zauzeti = new Set(
    termini
      .filter(t => t.status === "potvrdjen" || t.status === "cekanje")
      .map(t => `${t.datum} ${t.vrijeme}`)
  );

  kalendar.innerHTML = "";

  const danas = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2);

  let current = new Date(danas);
  let trenutnoOdabran = null; // spremamo button

  while (current <= maxDate) {
    const dan = current.getDay();
    if (dan !== 0 && dan !== 6) { // radni dani
      const datum = current.toISOString().split("T")[0];
      const dayDiv = document.createElement("div");
      dayDiv.className = "dan";
      dayDiv.innerHTML = `<h3>${datum}</h3>`;

      const slotovi = generirajSlotove();
      slotovi.forEach(vrijeme => {
        const key = `${datum} ${vrijeme}`;
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = "slot";
        slot.innerText = vrijeme;

        if (zauzeti.has(key)) {
          slot.disabled = true;
          slot.classList.add("zauzet");
        } else {
          slot.classList.add("slobodan");
          slot.addEventListener("click", () => {
            if (slot.disabled) return;
            // makni prethodni odabir
            if (trenutnoOdabran) trenutnoOdabran.classList.remove("odabran");
            // označi ovaj
            slot.classList.add("odabran");
            trenutnoOdabran = slot;

            // postavi hidden inpute u formi
            const terminInput = document.getElementById("termin");
            const vrijemeInput = document.getElementById("vrijeme");
            if (terminInput && vrijemeInput) {
              terminInput.value = datum;
              vrijemeInput.value = vrijeme;
            }
          });
        }

        dayDiv.appendChild(slot);
      });

      kalendar.appendChild(dayDiv);
    }
    current.setDate(current.getDate() + 1);
  }
}

prikaziKalendar();

// --------- REZERVACIJA ---------
const rezervacijaForma = document.querySelector("form[action='potvrda.html']");
if (rezervacijaForma) {
  rezervacijaForma.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = rezervacijaForma.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Šaljem...";
    }

    const ime = document.getElementById("ime").value.trim();
    const email = document.getElementById("email").value.trim();
    const datum = document.getElementById("termin").value;
    const vrijeme = document.getElementById("vrijeme").value;

    if (!datum || !vrijeme) {
      alert("Molimo odaberite termin iz kalendara.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Pošalji zahtjev";
      }
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/rezervacija", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ime, email, datum, vrijeme })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Greška pri slanju zahtjeva.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Pošalji zahtjev";
        }
        return;
      }

      // uspjeh -> idi na potvrdu
    window.location.href =
  `potvrda.html?ime=${encodeURIComponent(ime)}&email=${encodeURIComponent(email)}&datum=${encodeURIComponent(datum)}&vrijeme=${encodeURIComponent(vrijeme)}`;

    } catch (err) {
      console.error(err);
      alert("Greška pri slanju zahtjeva.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Pošalji zahtjev";
      }
    }
  });
}

// --------- POTVRDA ---------
const potvrdaForma = document.querySelector("form[action='#']");
if (potvrdaForma) {
  potvrdaForma.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = potvrdaForma.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Provjeravam...";
    }

    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get("email");
    const datum = urlParams.get("datum");
    const vrijeme = urlParams.get("vrijeme");
    const kod = document.getElementById("kod").value.trim();

    if (!email || !datum || !vrijeme) {
      alert("Nedostaju podaci o terminu. Molimo vratite se na početnu stranicu.");
      window.location.href = "/";
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/potvrdi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, datum, vrijeme, kod })
      });

      const text = await response.text();
      document.open();
      document.write(text);
      document.close();
    } catch (err) {
      console.error(err);
      alert("Greška pri potvrdi termina.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Potvrdi";
      }
    }
  });
}



