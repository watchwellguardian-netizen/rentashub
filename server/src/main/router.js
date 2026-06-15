function enhanceResponse(res) {
  res.json = (statusCode, payload) => {
    if (res.writableEnded) return;
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  };
  return res;
}

const DEFAULT_MAX_BODY_BYTES = 1_048_576;

async function readJsonBody(req, { maxBodyBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return {};
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBodyBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      error.code = "request_too_large";
      error.publicMessage = "Request body is too large.";
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    error.code = "invalid_json";
    error.publicMessage = "Request body must be valid JSON.";
    throw error;
  }
}

function matchRoute(routePath, pathname) {
  const routeParts = routePath.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (routeParts.length !== pathParts.length) return null;
  const params = {};
  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index];
    const pathPart = pathParts[index];
    if (routePart.startsWith(":")) params[routePart.slice(1)] = decodeURIComponent(pathPart);
    else if (routePart !== pathPart) return null;
  }
  return params;
}

function runStack(stack, req, res, onError) {
  let index = 0;
  const next = async (error) => {
    if (error) {
      onError(error, req, res);
      return;
    }
    const layer = stack[index];
    index += 1;
    if (!layer) return;
    try {
      await layer(req, res, next);
    } catch (caught) {
      onError(caught, req, res);
    }
  };
  next();
}

export function createRouter({ errorHandler, notFound, maxBodyBytes = DEFAULT_MAX_BODY_BYTES }) {
  const routes = [];
  const globalMiddleware = [];

  return {
    use(middleware) {
      globalMiddleware.push(middleware);
    },
    get(path, ...handlers) {
      routes.push({ method: "GET", path, handlers });
    },
    post(path, ...handlers) {
      routes.push({ method: "POST", path, handlers });
    },
    patch(path, ...handlers) {
      routes.push({ method: "PATCH", path, handlers });
    },
    delete(path, ...handlers) {
      routes.push({ method: "DELETE", path, handlers });
    },
    routes() {
      return routes.map(({ method, path }) => ({ method, path }));
    },
    async handler(req, rawRes) {
      const res = enhanceResponse(rawRes);
      const url = new URL(req.url, "http://localhost");
      const pathname = url.pathname;
      req.path = pathname;
      req.query = Object.fromEntries(url.searchParams.entries());
      try {
        req.body = await readJsonBody(req, { maxBodyBytes });
      } catch (error) {
        errorHandler(error, req, res);
        return;
      }
      let params = {};
      const route = routes.find((item) => {
        if (item.method !== req.method) return false;
        const matched = matchRoute(item.path, pathname);
        if (!matched) return false;
        params = matched;
        return true;
      });
      req.params = params;
      const stack = route ? [...globalMiddleware, ...route.handlers] : [...globalMiddleware, (request, response) => notFound(request, response)];
      runStack(stack, req, res, errorHandler);
    },
  };
}
