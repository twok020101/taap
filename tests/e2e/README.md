# Browser regression checks

Start the production build with `pnpm build && pnpm start`. In another shell:

```sh
python -m pip install 'playwright>=1.58,<2'
python -m playwright install chromium
python tests/e2e/demo.py
```

Optional: `TAAP_BASE_URL`, `TAAP_CHROMIUM_PATH`, `TAAP_E2E_OUTPUT`. Defaults are localhost:3000, Playwright Chromium, and `.cache/e2e`. Screenshots, traces and a JSON result list are retained. CI uploads them whether the browser suite succeeds or fails.

The suite uses a real Chromium browser, real app and real MapLibre overlay. Only external basemap styles are replaced with a deterministic empty background, avoiding tile availability as a software-test dependency. A separate context disables WebGL and clipboard to verify graceful degradation. It does not test live weather/air services or call Jev. Their availability and scientific accuracy must not be inferred from this suite.
