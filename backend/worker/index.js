import { Container, getContainer } from "@cloudflare/containers";

export class SonicallyContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "30m";

  // wrangler secrets are bound to the Worker (this.env), not automatically
  // forwarded to the container's OS process -- must be passed explicitly.
  get envVars() {
    return {
      MONGO_URL: this.env.MONGO_URL || "",
      DB_NAME: this.env.DB_NAME || "",
      JWT_SECRET: this.env.JWT_SECRET || "",
      CORS_ORIGINS: this.env.CORS_ORIGINS || "",
      R2_ACCOUNT_ID: this.env.R2_ACCOUNT_ID || "",
      R2_ACCESS_KEY_ID: this.env.R2_ACCESS_KEY_ID || "",
      R2_SECRET_ACCESS_KEY: this.env.R2_SECRET_ACCESS_KEY || "",
      R2_BUCKET: this.env.R2_BUCKET || "",
      RESEND_API_KEY: this.env.RESEND_API_KEY || "",
      PAYPAL_MODE: this.env.PAYPAL_MODE || "",
      PAYPAL_SANDBOX_CLIENT_ID: this.env.PAYPAL_SANDBOX_CLIENT_ID || "",
      PAYPAL_SANDBOX_CLIENT_SECRET: this.env.PAYPAL_SANDBOX_CLIENT_SECRET || "",
      PAYPAL_LIVE_CLIENT_ID: this.env.PAYPAL_LIVE_CLIENT_ID || "",
      PAYPAL_LIVE_CLIENT_SECRET: this.env.PAYPAL_LIVE_CLIENT_SECRET || "",
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
