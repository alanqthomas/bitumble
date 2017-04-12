// Imports
const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser')

const { indexRoute, tumbleRoute, debugRoute } = require('./controllers');

// Middleware
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/', indexRoute);
app.post('/tumble', tumbleRoute);
app.get('/debug', debugRoute);

// Listen
app.listen(3000, () => console.log('Listening on port 3000...'));
