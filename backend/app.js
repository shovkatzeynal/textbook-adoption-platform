const express = require('express');
const cors = require('cors');
const { frontendOrigin, trustProxy } = require('./config');
const routes = require('./routes');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', trustProxy);
app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
 if (['POST', 'PATCH'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)))
  return res.status(400).json({ message: 'A JSON object is required.' });
 next();
});
app.use(routes);
app.use((req, res) => res.status(404).json({ message: 'Not found.' }));
app.use((error, req, res, next) => {
 if (res.headersSent) return next(error);
 if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON.' });
 if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });
 if (error.status >= 400 && error.status < 500) return res.status(error.status).json({ message: error.message });
 if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This email or course already exists.' });
 // Never log SQL bindings (which may contain password hashes or personal data).
 console.error('API failure:', error.code || error.name || 'Unknown error');
 res.status(500).json({ message: 'Unable to complete the request. Please try again.' });
});
module.exports = app;
