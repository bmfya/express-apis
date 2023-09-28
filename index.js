const fs = require('fs').promises;
const path = require('path');
const express = require('express');

async function initializeAPIs(apisPath, utils = {},) {
  const router = express.Router();
  try {
    const files = await fs.readdir(apisPath);
    const jsFiles = files.filter((file) => path.extname(file) === '.js');
    for (const jsFile of jsFiles) {
      try {
        const handleApi = require(path.join(apisPath, jsFile));
        const {
          method = 'get',
          path: apiPath = '/' + path.basename(path.join(apisPath, jsFile), '.js'),
          middlewares = [],
        } = handleApi;

        router[method.toLowerCase()](apiPath, ...middlewares, createApiHandler(handleApi, utils));
      } catch (err) {
        console.error('Error handling API file:', err);
      }
    }
  } catch (err) {
    console.error('API read failed:', err);
    return null;
  }
  return router;
}

function createApiHandler(handleApi, utils) {
  return async (request, response) => {
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
