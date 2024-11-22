const express = require('express');
const http = require('http');
const { Command } = require('commander');
const multer = require('multer');
const path = require('path');
const fs = require ('fs');
const bodyParser = require('body-parser');

const app = express();
const program = new Command();
const upload = multer();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());  // Middleware для обробки raw тексту

program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <cache>', 'шлях до директорії для закешованих файлів');

program.parse(process.argv);

const options = program.opts();

if (!options.host || !options.port || !options.cache) {
  console.error('Помилка: усі параметри --host, --port та --cache повинні бути вказані!');
  process.exit(1);
}

//GET /notes/<ім’я нотатки>
app.get('/notes/:noteName', (req, res) => {
  const notePath = path.join(options.cache, req.params.noteName);

  if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
  }

  const noteText = fs.readFileSync(notePath, 'utf8');
  res.send(noteText);
});

//PUT /notes/<ім’я нотатки>
app.put('/notes/:noteName', (req, res) => {
  const notePath = path.join(options.cache, req.params.noteName);
  if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
  }
  const newText = req.body;
  if (newText === undefined) {
      return res.status(400).send('Enter text');
  }
  fs.writeFileSync(notePath, newText);
  res.send('Note updated');
});

//DELETE /notes/<ім’я нотатки>
app.delete('/notes/:noteName', (req, res) => {
  const notePath = path.join(options.cache, req.params.noteName);
  if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
  }
  fs.unlinkSync(notePath);
  res.send('Note deleted');
});

//GET /notes
app.get('/notes', (req, res) => {
  const files = fs.readdirSync(options.cache);
  const notes = files.map(fileName => {
      const text = fs.readFileSync(path.join(options.cache, fileName), 'utf8');
      return { name: fileName, text };
  });
  res.json(notes);
});

//POST /write
app.post('/write', upload.none(), (req, res) => {
  const noteName = req.body.note_name;
  const noteText = req.body.note;
  const notePath = path.join(options.cache, noteName);
  if (fs.existsSync(notePath)) {
      return res.status(400).send('Note already exists');
  }
  try {
      fs.writeFileSync(notePath, noteText);
      res.status(201).send('Note created');
  } catch (error) {
      console.error('Error writing note:', error);
      res.status(500).send('Error creating note');
  }
});

//GET /UploadForm.html
app.get('/UploadForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'UploadForm.html'));
});

console.log(`Host: ${options.host}\nPort: ${options.port}\nCache Directory: ${options.cache}`);

// Створення HTTP сервера, передаючи в нього Express додаток
const server = http.createServer(app);

server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});
