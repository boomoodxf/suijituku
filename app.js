const LOCAL_IMAGE_ENDPOINT = "/api/image";
const FALLBACK_IMAGE_ENDPOINT = "https://boudoir.ortlinde.com/random";
const INITIAL_SAMPLE_COUNT = 24;
const MORE_SAMPLE_COUNT = 12;

const homeView = document.querySelector("#homeView");
const sourceView = document.querySelector("#sourceView");
const readerView = document.querySelector("#readerView");
const sourceGrid = document.querySelector("#sourceGrid");
const imageGrid = document.querySelector("#imageGrid");
const homeStatus = document.querySelector("#homeStatus");
const sourceTitle = document.querySelector("#sourceTitle");
const sourceMeta = document.querySelector("#sourceMeta");
const imageTotal = document.querySelector("#imageTotal");
const sourceTotal = document.querySelector("#sourceTotal");
const typeTotal = document.querySelector("#typeTotal");
const resampleButton = document.querySelector("#resampleButton");
const homeFromSource = document.querySelector("#homeFromSource");
const loadMoreButton = document.querySelector("#loadMoreButton");
const stage = document.querySelector("#stage");
const stageImage = document.querySelector("#stageImage");
const stageCaption = document.querySelector("#stageCaption");
const readerName = document.querySelector("#readerName");
const readerCount = document.querySelector("#readerCount");
const prevImage = document.querySelector("#prevImage");
const nextImage = document.querySelector("#nextImage");
const homeLeft = document.querySelector("#homeLeft");
const homeRight = document.querySelector("#homeRight");

let items = [];
let activeSource = "";
let activeImages = [];
let imageIndex = 0;
let touchStart = null;

async function fetchApiImage() {
  const primaryUrl = `${LOCAL_IMAGE_ENDPOINT}?t=${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const fallbackUrl = `${FALLBACK_IMAGE_ENDPOINT}?t=${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let response = await fetch(primaryUrl, { cache: "no-store" }).catch(() => null);
  if (!response || !response.ok) {
    response = await fetch(fallbackUrl, { cache: "no-store" });
  }
  if (!response.ok) throw new Error("图片接口暂时不可用");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("接口没有返回图片");
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    url: URL.createObjectURL(blob),
    source: response.headers.get("x-image-source") || "unknown",
    type: response.headers.get("content-type") || blob.type || "image/jpeg",
    size: Number(response.headers.get("x-original-content-length") || blob.size || 0),
    sampledAt: new Date(),
  };
}

async function sampleImages(count, preferredSource = "") {
  let attempts = 0;
  let accepted = 0;
  while (accepted < count && attempts < count * 4) {
    attempts += 1;
    const item = await fetchApiImage();
    if (!preferredSource || item.source === preferredSource) {
      items.push(item);
      accepted += 1;
      renderAll();
    }
  }
}

function groupedSources() {
  const map = new Map();
  items.forEach((item) => {
    if (!map.has(item.source)) map.set(item.source, []);
    map.get(item.source).push(item);
  });
  return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
}

function renderAll() {
  renderSummary();
  renderSources();
  if (sourceView.classList.contains("active")) renderSourceImages();
}

function renderSummary() {
  imageTotal.textContent = String(items.length);
  sourceTotal.textContent = String(groupedSources().length);
  typeTotal.textContent = String(new Set(items.map((item) => item.type)).size);
}

function renderSources() {
  const groups = groupedSources();
  sourceGrid.innerHTML = "";
  groups.forEach(([source, sourceItems]) => {
    const latest = sourceItems[sourceItems.length - 1];
    const avgSize = Math.round(sourceItems.reduce((sum, item) => sum + item.size, 0) / sourceItems.length / 1024);
    const button = document.createElement("button");
    button.className = "source-card";
    button.type = "button";
    button.setAttribute("aria-label", `查看 ${source} 来源分类`);
    button.innerHTML = `
      <img src="${latest.url}" alt="${source} 来源封面" loading="lazy">
      <span class="source-info">
        <strong>${source}</strong>
        <span>API 响应头 x-image-source</span>
        <span class="source-stats">
          <span><em>${sourceItems.length}</em> 张</span>
          <span>均值 ${avgSize || 0} KB</span>
        </span>
      </span>
    `;
    button.addEventListener("click", () => openSource(source));
    sourceGrid.appendChild(button);
  });
  homeStatus.textContent = groups.length
    ? "分类来自 API 响应头 x-image-source。点击分类查看该来源下的所有图片。"
    : "正在通过 API 采样来源分类...";
}

function openSource(source) {
  activeSource = source;
  setView("source");
  renderSourceImages();
}

function renderSourceImages() {
  activeImages = items.filter((item) => item.source === activeSource);
  sourceTitle.textContent = activeSource;
  sourceMeta.textContent = `${activeImages.length} 张 · ${activeImages[0]?.type || "image/jpeg"}`;
  imageGrid.innerHTML = "";
  activeImages.forEach((item, index) => {
    const button = document.createElement("button");
    button.className = "image-card";
    button.type = "button";
    button.setAttribute("aria-label", `查看 ${activeSource} 第 ${index + 1} 张`);
    button.innerHTML = `
      <img src="${item.url}" alt="${activeSource} 第 ${index + 1} 张" loading="lazy">
      <span class="image-info">
        <strong>${activeSource} #${index + 1}</strong>
        <span>${Math.round(item.size / 1024) || 0} KB · ${item.type}</span>
      </span>
    `;
    button.addEventListener("click", () => openReader(index));
    imageGrid.appendChild(button);
  });
}

function openReader(index) {
  activeImages = items.filter((item) => item.source === activeSource);
  imageIndex = clampIndex(index, activeImages.length);
  setView("reader");
  renderReader();
}

function renderReader() {
  const item = activeImages[imageIndex];
  if (!item) return;
  readerName.textContent = item.source;
  readerCount.textContent = `${imageIndex + 1} / ${activeImages.length}`;
  stageCaption.textContent = `${Math.round(item.size / 1024) || 0} KB · ${item.type}`;
  stageImage.classList.remove("ready");
  stageImage.alt = `${item.source} 第 ${imageIndex + 1} 张`;
  stageImage.onload = () => stageImage.classList.add("ready");
  stageImage.src = item.url;
}

function setView(view) {
  homeView.classList.toggle("active", view === "home");
  sourceView.classList.toggle("active", view === "source");
  readerView.classList.toggle("active", view === "reader");
}

function goHome() {
  setView("home");
}

function moveImage(direction) {
  imageIndex = clampIndex(imageIndex + direction, activeImages.length);
  renderReader();
}

function clampIndex(index, length) {
  if (!length) return 0;
  return ((index % length) + length) % length;
}

async function resetSamples() {
  items.forEach((item) => URL.revokeObjectURL(item.url));
  items = [];
  activeSource = "";
  setView("home");
  renderAll();
  homeStatus.textContent = "正在通过 API 重新采样...";
  await sampleImages(INITIAL_SAMPLE_COUNT);
}

async function loadMoreForSource() {
  const source = activeSource;
  loadMoreButton.disabled = true;
  loadMoreButton.textContent = "正在采样...";
  await sampleImages(MORE_SAMPLE_COUNT, source);
  loadMoreButton.disabled = false;
  loadMoreButton.textContent = "继续采样这个分类";
}

function onTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}

function onTouchEnd(event) {
  if (!touchStart || !readerView.classList.contains("active")) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  touchStart = null;
  if (Math.abs(dx) < 42) return;
  moveImage(dx < 0 ? 1 : -1);
}

function onWheel(event) {
  if (!readerView.classList.contains("active")) return;
  event.preventDefault();
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 18) {
    moveImage(event.deltaX > 0 ? 1 : -1);
  }
}

function onKeyDown(event) {
  if (event.key === "Escape" && readerView.classList.contains("active")) setView("source");
  if (event.key === "Escape" && sourceView.classList.contains("active")) goHome();
  if (!readerView.classList.contains("active")) return;
  if (event.key === "ArrowLeft") moveImage(-1);
  if (event.key === "ArrowRight") moveImage(1);
  if (event.key === "Home") goHome();
}

resampleButton.addEventListener("click", resetSamples);
homeFromSource.addEventListener("click", goHome);
loadMoreButton.addEventListener("click", loadMoreForSource);
homeLeft.addEventListener("click", goHome);
homeRight.addEventListener("click", goHome);
prevImage.addEventListener("click", () => moveImage(-1));
nextImage.addEventListener("click", () => moveImage(1));
stage.addEventListener("touchstart", onTouchStart, { passive: true });
stage.addEventListener("touchend", onTouchEnd);
window.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("keydown", onKeyDown);

resetSamples();
