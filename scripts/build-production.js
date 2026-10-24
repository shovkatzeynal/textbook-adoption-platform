// Use CRA's own environment loading order before validating the public API origin.
process.env.NODE_ENV = 'production';
require('react-scripts/config/env');
// Publish runtime assets by default; opt in to source maps only in protected hosting.
if (process.env.GENERATE_SOURCEMAP === undefined) process.env.GENERATE_SOURCEMAP = 'false';
const value = process.env.REACT_APP_API_BASE_URL;
let valid = false;
try {
 const url = new URL(value);
 valid = url.protocol === 'https:' && url.origin === value.replace(/\/$/, '') &&
  !/^(localhost|.*\.localhost|127\..*|0\.0\.0\.0|\[::1\])$/i.test(url.hostname);
} catch { /* Report only the setting name, never arbitrary environment contents. */ }
if (!valid) {
 console.error('Set REACT_APP_API_BASE_URL to the public HTTPS API origin before building.');
 process.exitCode = 1;
} else {
 require('react-scripts/scripts/build');
}
