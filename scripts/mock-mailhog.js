const net = require('net');
const http = require('http');

const messages = [];

// SMTP Server on 1025
const smtpServer = net.createServer((socket) => {
  socket.write('220 localhost ESMTP MockMailHog\r\n');
  let body = '';
  let inData = false;

  socket.on('data', (data) => {
    const str = data.toString();
    if (inData) {
      body += str;
      if (body.includes('\r\n.\r\n') || body.endsWith('\n.\n') || body.endsWith('\r\n.')) {
        inData = false;
        // Parse basic email
        const toMatch = body.match(/To:\s*([^\r\n]+)/i);
        const fromMatch = body.match(/From:\s*([^\r\n]+)/i);
        const subjectMatch = body.match(/Subject:\s*([^\r\n]+)/i);
        messages.push({
          ID: 'msg-' + Date.now(),
          From: { Mailbox: fromMatch ? fromMatch[1] : 'sender' },
          To: [{ Mailbox: toMatch ? toMatch[1] : 'recipient', Raw: toMatch ? toMatch[1] : '' }],
          Content: {
            Headers: { Subject: [subjectMatch ? subjectMatch[1] : ''] },
            Body: body
          }
        });
        socket.write('250 OK\r\n');
      }
    } else {
      const upper = str.toUpperCase().trim();
      if (upper.startsWith('HELO') || upper.startsWith('EHLO')) {
        socket.write('250-localhost\r\n250 HELP\r\n');
      } else if (upper.startsWith('MAIL FROM:')) {
        socket.write('250 Sender OK\r\n');
      } else if (upper.startsWith('RCPT TO:')) {
        socket.write('250 Recipient OK\r\n');
      } else if (upper === 'DATA') {
        inData = true;
        body = '';
        socket.write('354 Start mail input; end with <CRLF>.<CRLF>\r\n');
      } else if (upper === 'QUIT') {
        socket.write('221 Bye\r\n');
        socket.end();
      } else {
        socket.write('250 OK\r\n');
      }
    }
  });
});

smtpServer.listen(1025, () => {
  console.log('Mock MailHog SMTP listening on port 1025');
});

// HTTP Server on 8025
const httpServer = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.url.startsWith('/api/v2/messages')) {
    res.writeHead(200);
    return res.end(JSON.stringify({
      total: messages.length,
      count: messages.length,
      start: 0,
      items: messages
    }));
  }

  if (req.url.startsWith('/api/v1/messages') && req.method === 'DELETE') {
    messages.length = 0;
    res.writeHead(200);
    return res.end(JSON.stringify({ success: true }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

httpServer.listen(8025, () => {
  console.log('Mock MailHog HTTP listening on port 8025');
});
