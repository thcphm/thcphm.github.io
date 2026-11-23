import { createLabModel, labPoses, lightLab } from "./lab-model.js";

export function createLabScene({ T, stage, canvas, motion, onReady, onLoss }) {
  T.ColorManagement.legacyMode = false;
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0, 0);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.09;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const world = new T.Scene();
  const model = createLabModel(T);
  world.add(model.root);
  lightLab(T, world);
  const camera = new T.PerspectiveCamera(labPoses.profile.fov, 1.6, .1, 80);
  const center = new T.Vector3();
  const aim = new T.Vector3();
  const eye = new T.Vector3();
  const temp = new T.Vector3();
  const orbit = new T.Spherical();
  const hero = stage.closest(".hero");
  let view = "profile", yaw = 0, tilt = 0, manual = false;
  let id = 0, ready = false, lost = false, snapNext = true, previousTime = 0;

  function queue() {
    if (!id && !lost && !document.hidden) id = window.requestAnimationFrame(draw);
  }
  function resize() {
    if (lost) return;
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    queue();
  }
  function release() {
    if (lost) return;
    lost = true;
    window.cancelAnimationFrame(id);
    if (observer) observer.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", scroll);
    document.removeEventListener("visibilitychange", queue);
    if (motion.removeEventListener) motion.removeEventListener("change", preference);
    else if (motion.removeListener) motion.removeListener(preference);
    onLoss();
  }
  function draw(time) {
    id = 0;
    if (lost || document.hidden) return;
    const pose = labPoses[view];
    eye.fromArray(pose.eye);
    aim.fromArray(pose.look);
    let fov = pose.fov, survey = -1;
    if (hero && !manual && !motion.matches) {
      const progress = T.MathUtils.clamp(-hero.getBoundingClientRect().top / Math.max(1, hero.offsetHeight), 0, 1);
      if (progress > 0 && progress < 1) survey = progress;
      if (view === "profile") {
        const mix = progress * .31;
        eye.lerp(temp.fromArray(labPoses.code.eye), mix);
        aim.lerp(temp.fromArray(labPoses.code.look), mix);
        fov = T.MathUtils.lerp(fov, labPoses.code.fov, mix);
      }
    }
    if (model.setSurvey) model.setSurvey(survey);
    orbit.setFromVector3(eye.sub(aim));
    orbit.theta += yaw;
    orbit.phi = T.MathUtils.clamp(orbit.phi + tilt, .32, 1.54);
    eye.setFromSpherical(orbit).add(aim);

    const dt = Math.min(50, Math.max(1, time - previousTime));
    previousTime = time;
    const amount = snapNext || motion.matches ? 1 : 1 - Math.exp(-.017 * dt);
    snapNext = false;
    camera.position.lerp(eye, amount);
    center.lerp(aim, amount);
    camera.fov = T.MathUtils.lerp(camera.fov, fov, amount);
    camera.updateProjectionMatrix();
    camera.lookAt(center);
    try { renderer.render(world, camera); }
    catch (_) { release(); return; }
    if (!ready) { ready = true; onReady(); }
    if (camera.position.distanceToSquared(eye) > 1e-6 || center.distanceToSquared(aim) > 1e-6 || Math.abs(camera.fov - fov) > .002) queue();
  }
  function scroll() {
    if (manual || motion.matches || !hero) return;
    const rect = stage.getBoundingClientRect();
    if (rect.bottom >= 0 && rect.top <= window.innerHeight) queue();
  }
  function preference() { snapNext = true; queue(); }
  const observer = window.ResizeObserver ? new window.ResizeObserver(resize) : null;
  if (observer) observer.observe(stage);
  else window.addEventListener("resize", resize);
  window.addEventListener("scroll", scroll, { passive: true });
  document.addEventListener("visibilitychange", queue);
  if (motion.addEventListener) motion.addEventListener("change", preference);
  else if (motion.addListener) motion.addListener(preference);
  canvas.addEventListener("webglcontextlost", function (event) { event.preventDefault(); release(); }, { once: true });
  resize();

  return {
    show(nextView, nextYaw, nextTilt, userControlled, immediate) {
      if (lost) return;
      if (!ready || view !== nextView) {
        model.setView(nextView);
        renderer.shadowMap.needsUpdate = true;
      }
      view = nextView;
      yaw = nextYaw;
      tilt = nextTilt;
      manual = userControlled;
      snapNext = snapNext || immediate;
      queue();
    }
  };
}

const workbench = document.getElementById("workbench");
if (workbench) workbench.dispatchEvent(new CustomEvent("lab-renderer", { detail: createLabScene }));
