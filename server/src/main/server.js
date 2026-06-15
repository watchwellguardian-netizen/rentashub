import { createServer } from "node:http";
import { app } from "./app.js";
import { config } from "../config/env.js";

const server = createServer(app.handler);

server.listen(config.port, () => {
  console.log(`RentasHub API scaffold listening on http://127.0.0.1:${config.port}`);
});
