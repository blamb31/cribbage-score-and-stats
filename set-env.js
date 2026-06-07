const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'environments');
const file = path.join(dir, 'environment.ts');
const prodFile = path.join(dir, 'environment.prod.ts');

// 1. Try to load local .env file if it exists (simple key-value parsing)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const firstEquals = trimmed.indexOf('=');
      if (firstEquals === -1) return;
      const key = trimmed.substring(0, firstEquals).trim();
      const value = trimmed.substring(firstEquals + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    });
    console.log('Loaded environment variables from local .env file.');
  } catch (err) {
    console.error('Warning: Failed to parse .env file:', err.message);
  }
}

// 2. Read keys from environment variables (or fall back to placeholder values)
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

const content = `export const environment = {
  production: false,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

const prodContent = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

// Ensure directory exists
if (!fs.existsSync(dir)){
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(file, content);
fs.writeFileSync(prodFile, prodContent);
console.log('Environment files generated successfully!');
