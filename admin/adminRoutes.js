require('dotenv').config();

const express = require('express');
const router = express.Router();
const client = require('prom-client');
const basicAuth = require('express-basic-auth');

const username = process.env.METRICS_USERNAME || 'default_username';
const password = process.env.METRICS_PASSWORD || 'default_password';

router.use(basicAuth({
    users: { [username]: password },
    unauthorizedResponse: (req) => {
        return req.auth ? 'Invalid credentials' : 'No credentials provided';
    }
}));

router.get('/', (req, res) => {
  res.set('Content-Type', client.register.contentType);
  client.register.metrics().then(metrics => {
    res.end(metrics);
  }).catch(err => {
    console.error(err);
    res.status(500).send('Internal Server Error');
  });
});

module.exports = router;
