const fs = require('fs');
const path = require('path');

async function initializeAPIs(apisPath, express, utils = {}) {
  if (!express) {
    return console.error('express is not defined');
  }

  const router = express.Router();

  try {
    const files = await fs.promises.readdir(apisPath);
    const jsFiles = files.filter((file) => path.extname(file) === '.js');
    jsFiles.forEach((jsFile) => handleJsFiles(path.join(apisPath, jsFile), router, utils));
  } catch (err) {
    console.error('API read failed:', err);
  }

  return router;
}

function handleJsFiles(filePath, router, utils) {
  try {
    const handleApi = require(filePath);
    const { method = 'get', path: apiPath = '/' + path.basename(filePath, '.js'), middleware = [] } = handleApi;

    router[method.toLowerCase()](apiPath, ...middleware, handleApiResponse(handleApi, utils));
  } catch (err) {
    console.error('Error handling API file:', err);
  }
}

function handleApiResponse(handleApi, utils) {
  return async function (request, response) {
    try {
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');

      const { query, params, body, method } = request;
      const ctx = { method, query, params, body, request, response, ...utils };
      const data = await (typeof handleApi === 'function' ? handleApi(ctx) : handleApi?.handle?.(ctx) || handleApi);

      if (data === null || data === undefined) {
        throw new Error('Internal error');
      }

      response.status(200)[typeof data === 'object' && data !== null ? 'json' : 'send'](data);
    } catch (error) {
      response.status(400).json({
        code: -1,
        message: error.message,
      });
    } finally {
      response.end();
    }
  };
}

module.exports = initializeAPIs;
