/* Runs the opening 3D landscape in a module worker on an OffscreenCanvas, so loading Three.js,
   building the world and drawing each scroll frame never block the page.
   Page -> worker: init {canvas, job}, frame {job}.   job = {kind: "draw" | "orbit", args, seq, dpr}
   Worker -> page: ready {seq}, drawn {seq}, lost, error {message} */

// The scene code expects a page: it makes label canvases through `document` and reads `window`.
if (typeof document === "undefined") {
  self.document = {
    createElement: () => new OffscreenCanvas(300, 150),
    querySelector: () => null,
  };
}
if (typeof window === "undefined") self.window = self;

let scene = null,
  pending = null,
  scheduled = false;
const nextFrame =
  typeof self.requestAnimationFrame === "function"
    ? (fn) => self.requestAnimationFrame(fn)
    : (fn) => setTimeout(fn, 16);

function run(job) {
  self.devicePixelRatio = job.dpr || 1;
  if (job.kind === "orbit") scene.orbit(...job.args);
  else scene.draw(...job.args);
}
function flush() {
  scheduled = false;
  if (!scene || !pending) return;
  const job = pending;
  pending = null;
  try {
    run(job);
    postMessage({ type: "drawn", seq: job.seq });
  } catch (error) {
    postMessage({ type: "error", message: String(error) });
  }
}
function schedule() {
  if (scheduled || !scene || !pending) return;
  scheduled = true;
  nextFrame(flush);
}

self.onmessage = async function (event) {
  const message = event.data;
  if (message.type === "init") {
    try {
      await import("/assets/vendor/three.min.js");
      const module = await import("/assets/field-scene.js?v=2");
      self.devicePixelRatio = message.job.dpr || 1;
      scene = module.createFieldScene(self.THREE, message.canvas, () => postMessage({ type: "lost" }));
      const job = pending || message.job;
      pending = null;
      run(job);
      postMessage({ type: "ready", seq: job.seq });
    } catch (error) {
      scene = null;
      postMessage({ type: "error", message: String(error) });
    }
  } else if (message.type === "frame") {
    pending = message.job;
    schedule();
  }
};
