# Plugin UI spike (not for merging)

Results: docs/decisions/0015-plugin-ui-loading.md on main.

    pnpm install
    npx vite &                                  # dev: Vite serves the app
    ./node_modules/electron/dist/electron --js-flags=--expose-gc main.mjs
    npx vite build && node compile.mjs plugins/hello
    SPIKE_MODE=prod ./node_modules/electron/dist/electron --js-flags=--expose-gc main.mjs
    node --expose-gc backend/reimport.mjs

main.mjs runs the scenario and logs one JSON line per step.
