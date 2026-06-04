const API_ORIGIN = "https://boudoir.ortlinde.com";
const GALLERY_COUNT = 12;
const IMAGES_PER_GALLERY = 8;

const galleryGrid = document.querySelector("#galleryGrid");
const homeStatus = document.querySelector("#homeStatus");
const refreshHome = document.querySelector("#refreshHome");
const homeView = document.querySelector("#homeView");
const readerView = document.querySelector("#readerView");
const stage = document.querySelector("#stage");
const stageImage = document.querySelector("#stageImage");
const stageCaption = document.querySelector("#stageCaption");
const readerName = document.querySelector("#readerName");
const readerCount = document.querySelector("#readerCount");
const prevImage = document.querySelector("#prevImage");
const nextImage = document.querySelector("#nextImage");
const homeLeft = document.querySelector("#homeLeft");
const homeRight = document.querySelector("#homeRight");

const galleryNames = [
  "晨光随机集",
  "窗边随机集",
  "丝绒随机集",
  "暗房随机集",
  "胶片随机集",
  "午夜随机集",
  "暖灯随机集",
  "海盐随机集",
  "花影随机集",
  "复古随机集",
  "银色随机集",
  "暮色随机集",
];

let galleries = [];
let galleryIndex = 0;
let imageIndex = 0;
let touchStart = null;
let wheelLocked = false;

function randomImageUrl() {
  return `${API_ORIGIN}/random?view=${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function fetchRandomImage() {
  try {
    const response = await fetch(randomImageUrl(), {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("接口暂时不可用");
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error("返回内容不是图片");
    return URL.createObjectURL(blob);
  } catch {
    return randomImageUrl();
  }
}

async function makeGallery(index) {
  const images = await Promise.all(Array.from({ length: IMAGES_PER_GALLERY }, fetchRandomImage));
  return {
    id: `gallery-${index}`,
    name: galleryNames[index] || `随机图集 ${index + 1}`,
    images,
  };
}

async function loadHome() {
  galleryGrid.innerHTML = "";
  homeStatus.textContent = "正在加载图集...";
  galleries = await Promise.all(Array.from({ length: GALLERY_COUNT }, (_, index) => makeGallery(index)));
  renderHome();
  homeStatus.textContent = "上下滑动可随机切换合集，左右滑动可切换图片。";
}

function renderHome() {
  galleryGrid.innerHTML = "";
  galleries.forEach((gallery, index) => {
    const button = document.createElement("button");
    button.className = "gallery-card";
    button.type = "button";
    button.setAttribute("aria-label", `打开${gallery.name}`);
    button.innerHTML = `
      <img src="${gallery.images[0]}" alt="${gallery.name}" loading="lazy">
      <span class="gallery-name">
        <strong>${gallery.name}</strong>
        <span>${gallery.images.length} 张</span>
      </span>
    `;
    button.addEventListener("click", () => openReader(index, 0));
    galleryGrid.appendChild(button);
  });
}

function setView(view) {
  homeView.classList.toggle("active", view === "home");
  readerView.classList.toggle("active", view === "reader");
}

function openReader(nextGalleryIndex, nextImageIndex = 0) {
  galleryIndex = clampIndex(nextGalleryIndex, galleries.length);
  imageIndex = clampIndex(nextImageIndex, galleries[galleryIndex].images.length);
  setView("reader");
  renderReader();
}

function backHome() {
  setView("home");
}

function renderReader() {
  const gallery = galleries[galleryIndex];
  const image = gallery.images[imageIndex];
  readerName.textContent = gallery.name;
  readerCount.textContent = `${imageIndex + 1} / ${gallery.images.length}`;
  stageCaption.textContent = "上下滑动切换随机合集，左右滑动切换图片";
  stageImage.classList.remove("ready");
  stageImage.alt = `${gallery.name} 第 ${imageIndex + 1} 张`;
  stageImage.onload = () => stageImage.classList.add("ready");
  stageImage.src = image;
}

async function ensureNeighborGallery(direction) {
  const nextIndex = direction > 0 ? galleryIndex + 1 : galleryIndex - 1;
  if (nextIndex >= 0 && nextIndex < galleries.length) return nextIndex;
  if (direction > 0) {
    homeStatus.textContent = "正在追加新的随机图集...";
    const gallery = await makeGallery(galleries.length);
    galleries.push(gallery);
    renderHome();
    return galleries.length - 1;
  }
  return galleries.length - 1;
}

async function moveGallery(direction) {
  const nextIndex = await ensureNeighborGallery(direction);
  galleryIndex = clampIndex(nextIndex, galleries.length);
  imageIndex = 0;
  renderReader();
}

function moveImage(direction) {
  const gallery = galleries[galleryIndex];
  imageIndex = clampIndex(imageIndex + direction, gallery.images.length);
  renderReader();
}

function clampIndex(index, length) {
  if (!length) return 0;
  return ((index % length) + length) % length;
}

function onWheel(event) {
  if (!readerView.classList.contains("active")) return;
  event.preventDefault();
  if (wheelLocked) return;
  const vertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);
  if (vertical && Math.abs(event.deltaY) > 28) {
    wheelLocked = true;
    moveGallery(event.deltaY > 0 ? 1 : -1).finally(unlockWheel);
  } else if (!vertical && Math.abs(event.deltaX) > 22) {
    wheelLocked = true;
    moveImage(event.deltaX > 0 ? 1 : -1);
    unlockWheel();
  }
}

function unlockWheel() {
  window.setTimeout(() => {
    wheelLocked = false;
  }, 360);
}

function onTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}

function onTouchEnd(event) {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 42) return;
  if (Math.abs(dy) > Math.abs(dx)) {
    moveGallery(dy < 0 ? 1 : -1);
  } else {
    moveImage(dx < 0 ? 1 : -1);
  }
}

function onKeyDown(event) {
  if (event.key === "Escape") backHome();
  if (!readerView.classList.contains("active")) return;
  if (event.key === "ArrowLeft") moveImage(-1);
  if (event.key === "ArrowRight") moveImage(1);
  if (event.key === "ArrowUp") moveGallery(-1);
  if (event.key === "ArrowDown") moveGallery(1);
  if (event.key === "Home") backHome();
}

refreshHome.addEventListener("click", loadHome);
homeLeft.addEventListener("click", backHome);
homeRight.addEventListener("click", backHome);
prevImage.addEventListener("click", () => moveImage(-1));
nextImage.addEventListener("click", () => moveImage(1));
stage.addEventListener("touchstart", onTouchStart, { passive: true });
stage.addEventListener("touchend", onTouchEnd);
window.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("keydown", onKeyDown);

loadHome();
