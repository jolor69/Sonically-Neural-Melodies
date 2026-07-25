import { Container, getContainer } from "@cloudflare/containers";

export class SonicallyContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "30m";
}

export default {
  async fetch(request, env) {
    // Single warm instance: the FastAPI app is stateless per-request
    // (all state lives in MongoDB), so one container handles all traffic.
    const instance = getContainer(env.SONICALLY_CONTAINER, "primary");
    return instance.fetch(request);
  },
};
