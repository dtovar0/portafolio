const crypto = require('crypto');

const password = 'YOUR_PASSWORD_HERE'; // I don't know the password
const passwordHash = 'scrypt:32768:8:1$g9tualBwM3ZRRUaU$e41152a9f683e058d049d514e9a3d1b0533ef5ca6bb1208e30e4d83d1ee37eb03733434d3c094b8a1b759e753eab3036284d5e5733b96a5705f46e1085bcdec2';

const parts = passwordHash.split(':');
const [n, r, p] = parts[1].split(':').map(Number);
const [salt, expectedHash] = parts[2].split('$');

const derivedKey = crypto.scryptSync(
    Buffer.from(password, 'utf8'),
    Buffer.from(salt, 'utf8'),
    64, 
    { N: n, r: r, p: p, maxmem: 128 * 1024 * 1024 }
);

console.log('Actual:', derivedKey.toString('hex'));
console.log('Expected:', expectedHash);
console.log('Match:', derivedKey.toString('hex') === expectedHash);
