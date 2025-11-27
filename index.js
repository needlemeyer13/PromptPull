#!/usr/bin/env node
// Minimal Node.js HTTP server — entrypoint for the project

const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from PromptPull\n');
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
