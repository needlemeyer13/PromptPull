const express = require('express');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Basic Sora URL check
function isSoraUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.hostname.includes('sora.chatgpt.com');
  } catch {
    return false;
  }
}

app.post('/api/extract', async (req, res) => {
  try {
    const url = (req.body && req.body.url) ? String(req.body.url).trim() : '';
    if (!isSoraUrl(url)) {
      return res.status(400).json({ error: 'Please provide a valid Sora link.' });
    }

    // fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response || !response.ok) return res.status(502).json({ error: 'Could not fetch the Sora page.' });

    const html = await response.text();
    const $ = cheerio.load(html);
    const promptText = $('meta[name="description"]').attr('content') || '';

    if (!promptText.trim()) return res.status(404).json({ error: 'No prompt found.' });

    return res.json({ prompt: promptText.trim() });
  } catch (error) {
    console.error('Error /api/extract:', error && error.stack ? error.stack : error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request to Sora timed out.' });
    }
    return res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PromptPull</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen flex flex-col items-center p-6 font-sans">
  <div class="max-w-lg w-full text-center mb-8 mt-4">
    <h1 class="text-4xl font-extrabold text-slate-800 mb-2">PromptPull</h1>
    <p class="text-slate-500">Paste a Sora video link to Pull Prompt.</p>
  </div>

  <div class="w-full max-w-lg h-24 bg-gray-200 mb-6 flex items-center justify-center rounded text-gray-400 text-sm border-2 border-dashed border-gray-300">Ad Space (Top)</div>

  <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
    <label class="block text-sm font-bold text-gray-700 mb-2">Sora Video Link</label>
    <input type="text" id="urlInput" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-slate-800" placeholder="https://sora.chatgpt.com/p/...">
    <button onclick="extractPrompt()" id="extractBtn" class="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 shadow-lg">Pull Prompt</button>
    <div id="resultArea" class="hidden mt-6">
      <textarea id="outputText" readonly class="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700"></textarea>
    </div>
    <p id="errorMsg" class="hidden mt-4 text-center text-red-500 text-sm"></p>
  </div>

  <div class="w-full max-w-lg h-60 bg-gray-200 mt-6 flex items-center justify-center rounded text-gray-400 text-sm border-2 border-dashed border-gray-300">Ad Space (Bottom)</div>

  <div class="mt-8 mb-12">
    <a href="https://ko-fi.com/ajens13" target="_blank" class="flex items-center gap-3 bg-[#FF5E5B] text-white px-8 py-3 rounded-full font-bold shadow-lg">☕ Buy me a Coffee</a>
  </div>

<script>
async function extractPrompt() {
  const btn = document.getElementById('extractBtn');
  const input = document.getElementById('urlInput');
  const output = document.getElementById('outputText');
  const resultArea = document.getElementById('resultArea');
  const errorMsg = document.getElementById('errorMsg');

  btn.innerText = 'Pulling...';
  btn.disabled = true;
  errorMsg.classList.add('hidden');
  resultArea.classList.add('hidden');

  try {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input.value.trim() })
    });
    const data = await res.json();
    if (data.error) {
      errorMsg.innerText = data.error;
      errorMsg.classList.remove('hidden');
    } else {
      output.value = data.prompt;
      resultArea.classList.remove('hidden');
    }
  } catch (err) {
    errorMsg.innerText = 'Error connecting to server.';
    errorMsg.classList.remove('hidden');
    console.error('Client extractPrompt error:', err);
  } finally {
    btn.innerText = 'Pull Prompt';
    btn.disabled = false;
  }
}
</script>
</body>
</html>
  `);
});

app.listen(port, () => console.log(`Running on ${port}`));
