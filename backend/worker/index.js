import { Container, getContainer } from "@cloudflare/containers";

export class SonicallyContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "30m";

  // NOTE: Container's own constructor declares `envVars = {}` as a plain
  // class field, which creates an own instance property. A `get envVars()`
  // accessor on this subclass gets silently shadowed by that -- own
  // properties win over inherited prototype accessors in JS. Must assign
  // in a constructor AFTER calling super() so it overwrites the default.
  constructor(ctx, env, options) {
    super(ctx, env, options);
    this.envVars = {
      MONGO_URL: env.MONGO_URL || "",
      DB_NAME: env.DB_NAME || "",
      JWT_SECRET: env.JWT_SECRET || "",
      CORS_ORIGINS: env.CORS_ORIGINS || "",
      R2_ACCOUNT_ID: env.R2_ACCOUNT_ID || "",
      R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID || "",
      R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY || "",
      R2_BUCKET: env.R2_BUCKET || "",
      RESEND_API_KEY: env.RESEND_API_KEY || "",
      PAYPAL_MODE: env.PAYPAL_MODE || "",
      PAYPAL_SANDBOX_CLIENT_ID: env.PAYPAL_SANDBOX_CLIENT_ID || "",
      PAYPAL_SANDBOX_CLIENT_SECRET: env.PAYPAL_SANDBOX_CLIENT_SECRET || "",
      PAYPAL_LIVE_CLIENT_ID: env.PAYPAL_LIVE_CLIENT_ID || "",
      PAYPAL_LIVE_CLIENT_SECRET: env.PAYPAL_LIVE_CLIENT_SECRET || "",
    };
  }
}

export default {
  async fetch(request, env) {
    // Single warm instance: the FastAPI app is stateless per-request
    // (all state lives in MongoDB), so one container handles all traffic.
    const instance = getContainer(env.SONICALLY_CONTAINER, "primary");
    return instance.fetch(request);
  },
};
