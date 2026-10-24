// CRA also reads root .env. Keep backend PORT independent of the frontend port.
process.env.PORT = process.env.FRONTEND_PORT || '3000';
require('react-scripts/scripts/start');
