import { expect } from "@esm-bundle/chai";
import { helloWorld } from "./messaging";

it("prints the correct output", () => {
  expect(helloWorld()).to.equal("hello world!");
});
