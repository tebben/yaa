import { mount } from "svelte";
import App from "./lib/App.svelte";
import { connectCore } from "./lib/core-connection.ts";
import { createWorkbench } from "./lib/workbench.svelte.ts";

const target = document.getElementById("app");
if (target === null) throw new Error("index.html has no #app element");

const core = connectCore();
mount(App, { target, props: { workbench: createWorkbench(core) } });
