import { Container, getContainer } from "@cloudflare/containers";
export class TestContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "5m";
}
export default {
  async fetch(request, env) {
    const instance = getContainer(env.TEST_CONTAINER, "primary");
    return instance.fetch(request);
  },
};
