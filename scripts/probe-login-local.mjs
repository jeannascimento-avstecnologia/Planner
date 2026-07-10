import { readFileSync } from "node:fs";
import { join } from "node:path";

const port = process.env.PORT ?? "3002";
const base = `http://127.0.0.1:${port}`;
const email = process.argv[2] ?? "admin@nextgen.dev";
const password = process.argv[3] ?? "password123";

const manifest = JSON.parse(
  readFileSync(
    join("apps", "web", ".next", "server", "server-reference-manifest.json"),
    "utf8",
  ),
);

let action = "";
for (const [id, v] of Object.entries(manifest.node ?? {})) {
  if (v.exportedName === "signIn" && v.workers?.["app/(auth)/login/page"]) {
    action = id;
    break;
  }
}

const pageRes = await fetch(`${base}/login`, { headers: { Accept: "text/html" } });
const setCookies = pageRes.headers.getSetCookie?.() ?? [];
const cookieHeader = setCookies.map((c) => c.split(";")[0]).join("; ");
console.log("page", pageRes.status, "cookies", setCookies.length);

const body =
  `------T\r\nContent-Disposition: form-data; name="email"\r\n\r\n${email}\r\n` +
  `------T\r\nContent-Disposition: form-data; name="password"\r\n\r\n${password}\r\n` +
  `------T\r\nContent-Disposition: form-data; name="rememberMe"\r\n\r\ntrue\r\n------T--\r\n`;

const res = await fetch(`${base}/login`, {
  method: "POST",
  headers: {
    Accept: "text/x-component",
    "Content-Type": "multipart/form-data; boundary=----T",
    Cookie: cookieHeader,
    Origin: base,
    Referer: `${base}/login`,
    "Next-Action": action,
    "Next-Router-State-Tree": "%5B%22%22%2C%7B%7D%5D",
    "Next-Url": "/login",
  },
  body,
});

const text = await res.text();
console.log("ACTION", action);
console.log("STATUS", res.status);
console.log("BODY", text.slice(0, 500));
