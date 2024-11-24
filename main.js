const express = require('express');
const http = require('http');
const { Command } = require('commander');
const multer = require('multer');
const path = require('path');
const fs = require ('fs');
const bodyParser = require('body-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const program = new Command();
const upload = multer();

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Notes Service API",
      version: "1.0.0",
      description: "API documentation for the Note Service",
    },
  },
  apis: ["./main.js"], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);


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

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /notes/{noteName}:
 *   get:
 *     description: Get a note by its name
 *     parameters:
 *       - in: path
 *         name: noteName
 *         required: true
 *         description: The name of the note
 *     responses:
 *       200:
 *         description: The note content
 *       404:
 *         description: Note not found
 */
//GET /notes/<ім’я нотатки>
app.get('/notes/:noteName', (req, res) => {
  const notePath = path.join(options.cache, req.params.noteName);

  if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
  }
  debugger;
  const noteText = fs.readFileSync(notePath, 'utf8');
  res.send(noteText);
});

/**
 * @swagger
 * /notes/{noteName}:
 *   put:
 *     description: Update a note by its name
 *     parameters:
 *       - in: path
 *         name: noteName
 *         required: true
 *         description: The name of the note
 *       - in: body
 *         name: noteText
 *         required: true
 *         description: The new content of the note
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The note has been updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Note not found
 */
// PUT /notes/<ім’я нотатки>
app.put('/notes/:noteName', (req, res) => {
    const notePath = path.join(options.cache, req.params.noteName);
    if (!fs.existsSync(notePath)) {
        return res.status(404).send('Not found');
    }
    const text = req.body;
    if (text === undefined) {
        return res.status(400).send('Enter text');
    }
    try {
        debugger;
        fs.writeFileSync(notePath, String(text), 'utf8');
        res.send('Note updated');
    } catch (err) {
        console.error('Помилка запису у файл:', err);
        res.status(500).send('Internal server error');
    }
});

/**
 * @swagger
 * /notes/{noteName}:
 *   delete:
 *     description: Delete a note by its name
 *     parameters:
 *       - in: path
 *         name: noteName
 *         required: true
 *         description: The name of the note
 *     responses:
 *       200:
 *         description: The note has been deleted
 *       404:
 *         description: Note not found
 */
//DELETE /notes/<ім’я нотатки>
app.delete('/notes/:noteName', (req, res) => {
  const notePath = path.join(options.cache, req.params.noteName);
  if (!fs.existsSync(notePath)) {
      return res.status(404).send('Not found');
  }
  debugger;
  fs.unlinkSync(notePath);
  res.send('Note deleted');
});

/**
 * @swagger
 * /notes:
 *   get:
 *     description: Get a list of all notes
 *     responses:
 *       200:
 *         description: A list of all notes with their names and content
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: The name of the note
 *                   text:
 *                     type: string
 *                     description: The content of the note
 */
//GET /notes
app.get('/notes', (req, res) => {
  const files = fs.readdirSync(options.cache);
  const notes = files.map(fileName => {
      debugger;
      const text = fs.readFileSync(path.join(options.cache, fileName), 'utf8');
      return { name: fileName, text };
  });
  res.json(notes);
});

/**
 * @swagger
 * /write:
 *   post:
 *     description: Create a new note
 *     parameters:
 *       - in: body
 *         name: note
 *         description: The note to create
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             note_name:
 *               type: string
 *               example: "New Note"
 *             note:
 *               type: string
 *               example: "This is the content of the new note."
 *     responses:
 *       201:
 *         description: Note created successfully
 *       400:
 *         description: Note already exists
 *       500:
 *         description: Internal server error
 */
//POST /write
app.post('/write', upload.none(), (req, res) => {
  const noteName = req.body.note_name;
  const noteText = req.body.note;
  const notePath = path.join(options.cache, noteName);
  if (fs.existsSync(notePath)) {
      return res.status(400).send('Note already exists');
  }
  try {
      debugger;
      fs.writeFileSync(notePath, noteText);
      res.status(201).send('Note created');
  } catch (error) {
      console.error('Error writing note:', error);
      res.status(500).send('Error creating note');
  }
});

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     description: Serve the UploadForm.html file for uploading notes
 *     responses:
 *       200:
 *         description: Returns the HTML form for uploading notes
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: '<html>...</html>'
 */
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
