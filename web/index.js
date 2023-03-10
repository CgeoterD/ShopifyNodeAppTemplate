//* Main imports
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
//* Parts imports
import shopify from "./shopify-auth/shopify.js";
import WebhookHandlers from "./webhooks/webhooks.js";
import {apiRequest} from './routes/apiRequest.js';

//* Settings
const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT, 10);
const STATIC_PATH = process.env.NODE_ENV === "production" ? `${process.cwd()}/frontend/dist` : `${process.cwd()}/frontend/`;

//* <========================================== App =================================================>
const app = express();

//* Set up Shopify authentication
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(shopify.config.auth.callbackPath,shopify.auth.callback(),shopify.redirectToShopifyOrAppRoot());

//* Webhooks 
// Webhook process (webhook handlers in webhook folder webhooks.js)
app.post(shopify.config.webhooks.path,shopify.processWebhooks({ webhookHandlers: WebhookHandlers }));
// Endpoint for register web hook
app.post('/api/webhook/register', async (req,res) => {
  const response = await shopify.api.webhooks.register({
    session: res.locals.shopify.session,
  });
  console.log(response)
  res.status(200).send('Webhook registered!')

})

//* API ENDPOINTS (All endpoints after this point will require an active session)
app.use("/api/*", shopify.validateAuthenticatedSession());
app.use(express.json());
app.use(`/api`, apiRequest)


//* Frontend endpoint 
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
