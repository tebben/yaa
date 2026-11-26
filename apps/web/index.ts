import { mount } from "svelte";
import App from "./lib/App.svelte";
import { connectCore } from "./lib/core-connection.ts";
import { createCoreInfo } from "./lib/core-info.svelte.ts";

const target = document.getElementById("app");
if (target === null) throw new Error("index.html has no #app element");

const core = connectCore();
mount(App, { target, props: { coreInfo: createCoreInfo(core) } });
