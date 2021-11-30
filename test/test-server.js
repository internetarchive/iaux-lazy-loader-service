const http = require('http');
const fs = require('fs');
const { exit } = require('process');

/**
 * This file is to test the lazy loader retry functionality.
 *
 * The first request to the server will always return a 404,
 * the second request will return a 200, then shut down.
 */

const lockFile = './file.txt';
let server;

function deleteLockfile() {
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
}

function shutdown() {
  deleteLockfile();
  server.close();
  process.exit();
}

process
  .on('SIGTERM', shutdown)
  .on('SIGINT', shutdown)
  .on('uncaughtException', shutdown);

const requestListener = function (req, res) {
  try {
    if (fs.existsSync(lockFile)) {
      res.writeHead(200);
      res.end(
        'window.otherService = { getResponse() { return "someotherresponse"; }}'
      );
      shutdown();
    } else {
      fs.writeFileSync(lockFile, 'locked');
      res.writeHead(404);
      res.end('Not Found');
    }
  } catch (err) {
    console.error(err);
  }
};

deleteLockfile();
server = http.createServer(requestListener);
server.listen(5432);
