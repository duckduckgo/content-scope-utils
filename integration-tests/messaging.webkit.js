import { test, expect } from "@playwright/test";
import { forwardConsole, withMockedWebkitHandlers } from "../lib/test-helpers/webkit.js";

test.describe("webkit modern messaging", () => {
  test("runs when config provided", async ({ page }) => {
    const bundled = new BundledPage(page);
    await bundled.withMocks({
      getData: { id: "01" },
      foo: null,
    });
    await bundled.withInjectedConfig({
      secret: "hello-world",
      webkitMessageHandlerNames: [], // <-- not a requirement in modern mode
      hasModernWebkitAPI: true,
    });
    const outputs = await bundled.getPageOutputs();
    expect(outputs).toMatchObject([["getData", { id: "01" }]]);
  });
});
test.describe("webkit encrypted messaging", () => {
  test("runs when config provided", async ({ page }) => {
    const bundled = new BundledPage(page);
    await bundled.withMocks({
      getData: { id: "01" },
      foo: null,
    });
    await bundled.withInjectedConfig({
      secret: "hello-world",
      webkitMessageHandlerNames: ["foo", "getData"],
      hasModernWebkitAPI: false,
    });
    const outputs = await bundled.getPageOutputs();
    expect(outputs).toMatchObject([["getData", { id: "01" }]]);
  });
  test("fails when message handlers are absent (ie: missed/not added by native side)", async ({ page }) => {
    const bundled = new BundledPage(page);
    await bundled.withMocks({
      // empty mocks to simulate the message handlers not being available
    });
    await bundled.withInjectedConfig({
      secret: "hello-world",
      webkitMessageHandlerNames: [], // <-- empty since we're mocking the fact that handler are absent
      hasModernWebkitAPI: false,
    });
    const outputs = await bundled.getPageOutputs();
    expect(outputs).toMatchObject([
      ["error", "Missing webkit handler: 'foo'"],
      ["error", "Missing webkit handler: 'getData'"],
    ]);
  });
  test("fails when message handler names are absent", async ({ page }) => {
    const bundled = new BundledPage(page);
    await bundled.withMocks({
      getData: { id: "01" },
      foo: null,
    });
    await bundled.withInjectedConfig({
      secret: "hello-world",
      webkitMessageHandlerNames: ["foo"], // <-- A missing handler name, so it won't be captured
      hasModernWebkitAPI: false,
    });
    const outputs = await bundled.getPageOutputs();
    expect(outputs).toMatchObject([["error", "cannot continue, method getData not captured on macos < 11"]]);
  });
});

/**
 * This represents "examples/bundled/index.html"
 */
class BundledPage {
  /**
   * @param {import("playwright-core").Page} page
   */
  constructor(page) {
    this.page = page;
    forwardConsole(page);
  }

  /**
   * @param {import("../lib/messaging/webkit.js").WebkitMessagingConfig} config
   */
  async withInjectedConfig(config) {
    const params = new URLSearchParams();
    params.set("injected", JSON.stringify(config));
    await this.page.goto("/?" + params.toString());
  }

  /**
   * @param mocks
   * @returns {Promise<void>}
   */
  async withMocks(mocks) {
    await withMockedWebkitHandlers(this.page, mocks);
  }

  /**
   * @returns {Promise<unknown[]>}
   */
  async getPageOutputs() {
    return await this.page.evaluate(() => {
      const outputs = [];
      const elements = document.querySelectorAll("code");
      for (let element of elements) {
        const json = JSON.parse(element?.textContent || "{}");
        outputs.push(json);
      }
      return outputs;
    });
  }
}
