import { expect } from "@esm-bundle/chai";
import { fromConfig, Messaging } from "../messaging.js";
import { WindowsMessagingConfig, WindowsMessagingTransport } from "./windows.js";
import { WebkitMessagingConfig, WebkitMessagingTransport } from "./webkit.js";

it("can construct webkit messaging", async () => {
  const injectedConfig = {
    hasModernWebkitAPI: true,
    webkitMessageHandlerNames: [],
    secret: "dax",
  };
  const config = new WebkitMessagingConfig(
    injectedConfig.hasModernWebkitAPI,
    injectedConfig.webkitMessageHandlerNames,
    injectedConfig.secret
  );
  const messaging = fromConfig(config);
  expect(messaging).to.be.instanceOf(Messaging);
  expect(messaging.transport).to.be.instanceOf(WebkitMessagingTransport);
});

it("can construct windows messaging", async () => {
  const injectedWindowsConfig = {
    featureName: "DuckPlayer",
  };
  const config = new WindowsMessagingConfig(injectedWindowsConfig.featureName);
  const messaging = fromConfig(config);
  expect(messaging).to.be.instanceOf(Messaging);
  expect(messaging.transport).to.be.instanceOf(WindowsMessagingTransport);
});
