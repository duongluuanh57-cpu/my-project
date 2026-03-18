const crypto = require('crypto');

const SECRET = process.env.ENCRYPT_SECRET || 'financeapp_secret_32chars_key!!!';
const KEY    = crypto.scryptSync(SECRET, 'salt', 32);
const IV_LEN = 16;

function encrypt(value) {
  const iv     = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const enc    = Buffer.concat([cipher.update(String(value)), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(text) {
  try {
    const [ivHex, encHex] = text.split(':');
    const iv       = Buffer.from(ivHex, 'hex');
    const enc      = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString();
  } catch {
    return '0';
  }
}

module.exports = { encrypt, decrypt };
