import assert from "node:assert/strict";
import test from "node:test";
import { colorForDomain, groupKey, hostnameFromUrl, registrableDomain } from "../src/domain.js";

test("hostnameFromUrl strips www and ignores non-http tabs", () => {
  assert.equal(hostnameFromUrl("https://www.github.com/sazlin"), "github.com");
  assert.equal(hostnameFromUrl("http://Reddit.com/r/programming"), "reddit.com");
  assert.equal(hostnameFromUrl("chrome://newtab/"), null);
  assert.equal(hostnameFromUrl("about:blank"), null);
  assert.equal(hostnameFromUrl("chrome-extension://abc/popup.html"), null);
  assert.equal(hostnameFromUrl(undefined), null);
});

test("registrableDomain groups common subdomains", () => {
  assert.equal(registrableDomain("mail.google.com"), "google.com");
  assert.equal(registrableDomain("gist.github.com"), "github.com");
  assert.equal(registrableDomain("github.com"), "github.com");
  assert.equal(registrableDomain("docs.google.co.uk"), "google.co.uk");
  assert.equal(registrableDomain("user.github.io"), "user.github.io");
  assert.equal(registrableDomain("localhost"), "localhost");
  assert.equal(registrableDomain("127.0.0.1"), "127.0.0.1");
});

test("groupKey respects the subdomain setting", () => {
  assert.equal(groupKey("https://mail.google.com/mail", true), "google.com");
  assert.equal(groupKey("https://mail.google.com/mail", false), "mail.google.com");
  assert.equal(groupKey("chrome://extensions", true), null);
});

test("colorForDomain is stable", () => {
  assert.equal(colorForDomain("github.com"), colorForDomain("github.com"));
  assert.notEqual(colorForDomain("github.com"), colorForDomain("reddit.com"));
});
