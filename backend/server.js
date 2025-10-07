// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const db = require('./db'); // pretpostavka: db.promise() iz mysql2
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// -------------------------------------------------
// 1) API: vraća SAMO potvrđene (potvrdjen) termine
// -------------------------------------------------
app.get('/termini', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         id,
         ime,
         email,
         DATE_FORMAT(datum, '%Y-%m-%d') AS datum,
         TIME_FORMAT(vrijeme, '%H:%i') AS vrijeme,
         status
       FROM termini
       WHERE datum >= CURDATE() AND status = 'potvrdjen'
       ORDER BY datum, vrijeme`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /termini error', err);
    res.status(500).json({ message: 'Greška pri dohvaćanju termina.' });
  }
});

// -------------------------------------------------
// Serviraj frontend (nakon API ruta)
// -------------------------------------------------
app.use(express.static(path.join(__dirname, '../frontend')));

// -------------------------------------------------
// Nodemailer (ostavi kako već imaš — pazi lozinku)
// -------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'izgradipc@gmail.com',
    pass: 'ehdyhpfpmicnhuhb'
  }
});

// -------------------------------------------------
// 2) Rezervacija: stavi zapis u pending_termini (ne u termini)
// -------------------------------------------------
app.post('/rezervacija', async (req, res) => {
  const { ime, email, datum, vrijeme } = req.body;
  if (!ime || !email || !datum || !vrijeme) {
    return res.status(400).json({ message: 'Nedostaju podaci.' });
  }

  try {
    // ako već postoji potvrđeni termin za taj slot -> odbijamo odmah
    const [already] = await db.query(
      `SELECT id FROM termini WHERE datum = ? AND vrijeme = ? AND status = 'potvrdjen'`,
      [datum, vrijeme]
    );
    if (already.length > 0) {
      return res.status(409).json({ message: 'Taj termin je već zauzet.' });
    }

    // generiraj kod i expiry (npr. 15 minuta)
    const kod = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min od sada

    // spremi u pending_termini (privremeno)
    await db.query(
      `INSERT INTO pending_termini (ime, email, datum, vrijeme, kod, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ime, email, datum, vrijeme, kod, expiresAt]
    );

    // pošalji mail s kodom
    await transporter.sendMail({
      from: '"Frizerski salon" <izgradipc@gmail.com>',
      to: email,
      subject: 'Potvrda termina šišanja',
      text: `Tvoj kod za potvrdu termina (${datum} u ${vrijeme}) je: ${kod}\nKod vrijedi 15 minuta.`
    });

    res.json({ message: 'Zahtjev poslan. Provjeri Gmail za kod.' });
  } catch (err) {
    console.error('POST /rezervacija error', err);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

// -------------------------------------------------
// 3) Potvrda: provjeri kod u pending_termini, tek onda INSERT u termini
// -------------------------------------------------
app.post('/potvrdi', async (req, res) => {
  const { email, datum, vrijeme, kod } = req.body;
  if (!email || !datum || !vrijeme || !kod) {
    return res.send(`<html><body><h1>❌ Nedostaju podaci!</h1><a href="/">Nazad</a></body></html>`);
  }

  try {
    // 1) provjeri postoji li odgovarajući pending i da nije istekao
    const [pendingRows] = await db.query(
      `SELECT * FROM pending_termini 
       WHERE email = ? AND datum = ? AND vrijeme = ? AND kod = ? AND expires_at > NOW()`,
      [email, datum, vrijeme, kod]
    );

    if (pendingRows.length === 0) {
      // nije pronađen ili je istekao / pogrešan kod
      return res.send(`<html><body><h1>❌ Pogrešan kod ili istekla validnost.</h1><a href="/">Nazad</a></body></html>`);
    }

    const pending = pendingRows[0];

    // 2) ponovno provjeri da ne postoji confirmed termin (race condition safeguard)
    const [conf] = await db.query(
      `SELECT id FROM termini WHERE datum = ? AND vrijeme = ? AND status = 'potvrdjen'`,
      [datum, vrijeme]
    );
    if (conf.length > 0) {
      // netko je potvrdio prije tebe
      // ukloni pending ili ostavi — ja ću izbrisati taj pending jer je slot zauzet
      await db.query('DELETE FROM pending_termini WHERE id = ?', [pending.id]);
      return res.send(`<html><body><h1>❌ Nažalost, termin je upravo zauzet.</h1><a href="/">Nazad</a></body></html>`);
    }

    // 3) sve OK -> ubaci u glavnu tablicu termini sa statusom 'potvrdjen'
    await db.query(
      `INSERT INTO termini (ime, email, datum, vrijeme, kod, status)
       VALUES (?, ?, ?, ?, ?, 'potvrdjen')`,
      [pending.ime, pending.email, pending.datum, pending.vrijeme, pending.kod]
    );

    // 4) obriši pending
    await db.query('DELETE FROM pending_termini WHERE id = ?', [pending.id]);

    // 5) vrati korisniku success stranicu
    res.send(`
      <html>
        <body>
          <h1 style="color:green;">✅ Termin uspješno potvrđen!</h1>
          <a href="/">⬅ Povratak na početnu</a>
        </body>
      </html>
    `);

  } catch (err) {
    console.error('POST /potvrdi error', err);
    res.status(500).send('<h1>⚠ Greška na serveru.</h1>');
  }
});

// -------------------------------------------------
// 4) Čišćenje starih pending zapisa (automatski)
// -------------------------------------------------
// briše sve expired pending unose svake 10 minute
setInterval(async () => {
  try {
    await db.query('DELETE FROM pending_termini WHERE expires_at < NOW()');
  } catch (err) {
    console.error('Cleanup pending_termini error', err);
  }
}, 10 * 60 * 1000);

// pokreni server
app.listen(3000, () => {
  console.log('Server radi na http://localhost:3000');
});
