import { chromium } from "playwright";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

const routes = [
  "/",
  "/about",
  "/services",
  "/sectors",
  "/projects",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
];

async function prerender() {
  const app = express();
  app.use(express.static(distDir));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(4173, () => {
      console.log("Prerender server running on http://localhost:4173");
      resolve(s);
    });
  });

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    for (const route of routes) {
      const url = `http://localhost:4173${route}`;
      console.log(`Prerendering ${url}...`);

      try {
        const context = await browser.newContext({
          userAgent: "Mozilla/5.0 (compatible; PrerenderBot/1.0)",
        });
        const page = await context.newPage();

        await page.route("**/*", (route) => {
          const url = route.request().url();
          if (
            ["image", "font", "stylesheet", "other"].includes(route.request().resourceType()) &&
            !url.startsWith("http://localhost:4173")
          ) {
            route.abort();
          } else {
            route.continue();
          }
        });

        await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForSelector("#root", { timeout: 15000 });
        await page.waitForTimeout(2000);

        let html = await page.content();

        html = html.replace(/<title>[^<]*<\/title><title>/g, "<title>");
        html = html.replace(/<meta name="description"[^>]*>\s*<meta name="description"/g, '<meta name="description"');

        if (route === "/") {
          fs.writeFileSync(path.join(distDir, "index.html"), html);
          console.log("  -> dist/index.html");
        } else {
          const dir = path.join(distDir, route.slice(1));
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, "index.html"), html);
          console.log(`  -> dist${route}/index.html`);
        }

        await context.close();
      } catch (err) {
        console.error(`  Failed to prerender ${route}:`, err.message);
      }
    }

    await browser.close();
    console.log("Prerendering complete!");
  } catch (err) {
    console.error("Prerender skipped:", err.message);
  } finally {
    server.close();
  }
}

prerender();
