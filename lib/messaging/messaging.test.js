import { expect } from "@esm-bundle/chai";
import { Messaging } from "../messaging.js";
import { WindowsMessagingConfig, WindowsMessagingTransport } from "./windows.js";
import { WebkitMessagingConfig, WebkitMessagingTransport } from "./webkit.js";

it("can construct webkit messaging", async () => {
  const config = new WebkitMessagingConfig({
    secret: "dax",
    webkitMessageHandlerNames: [],
    hasModernWebkitAPI: true,
  });
  const messaging = new Messaging(config);
  expect(messaging).to.be.instanceOf(Messaging);
  expect(messaging.transport).to.be.instanceOf(WebkitMessagingTransport);
});

it("can construct windows messaging", async () => {
  const config = new WindowsMessagingConfig({
    featureName: "DuckPlayer",
  });
  const messaging = new Messaging(config);
  expect(messaging).to.be.instanceOf(Messaging);
  expect(messaging.transport).to.be.instanceOf(WindowsMessagingTransport);
});
