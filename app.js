const API_ORIGIN = "https://boudoir.ortlinde.com";
const GALLERIES_PER_TAG = 8;
const IMAGES_PER_GALLERY = 10;

const tagGrid = document.querySelector("#tagGrid");
const galleryGrid = document.querySelector("#galleryGrid");
const homeStatus = document.querySelector("#homeStatus");
const tagStatus = document.querySelector("#tagStatus");
const refreshHome = document.querySelector("#refreshHome");
const backToTags = document.querySelector("#backToTags");
const homeView = document.querySelector("#homeView");
const tagView = document.querySelector("#tagView");
const readerView = document.querySelector("#readerView");
const tagEyebrow = document.querySelector("#tagEyebrow");
const tagTitle = document.querySelector("#tagTitle");
const stage = document.querySelector("#stage");
const stageImage = document.querySelector("#stageImage");
const stageCaption = document.querySelector("#stageCaption");
const readerName = document.querySelector("#readerName");
const readerCount = document.querySelector("#readerCount");
const prevImage = document.querySelector("#prevImage");
const nextImage = document.querySelector("#nextImage");
const homeLeft = document.querySelector("#homeLeft");
const homeRight = document.querySelector("#homeRight");

const tags = [
  { id: "portrait", name: "人像写真", tone: "柔光、室内、自然姿态" },
  { id: "window", name: "窗边光影", tone: "窗光、浅色、安静氛围" },
  { id: "velvet", name: "丝绒质感", tone: "复古、暗调、柔软质地" },
  { id: "film", name: "胶片风格", tone: "颗粒、暖色、生活感" },
  { id: "midnight", name: "午夜暖灯", tone: "低照度、暖灯、私密感" },
  { id: "summer", name: "夏日海盐", tone: "明亮、户外、清爽色彩" },
  { id: "classic", name: "复古房间", tone: "旧家具、花纹、怀旧气质" },
  { id: "silver", name: "银色瞬间", tone: "冷光、清透、简洁构图" },
];

const galleryNameSeeds = [
  "晨光",
  "窗边",
  "丝绒",
  "暗房",
  "胶片",
  "午夜",
  "暖灯",
  "海盐",
  "花影",
  "复古",
  "银色",
  "暮色",
  "长廊",
  "镜前",
  "假日",
  "微风",
];

let activeTagIndex = 0;
let galleries = [];
let galleryIndex = 0;
let imageIndex = 0;
let touchStart = null;

function randomImageUrl() {
  return `${API_ORIGIN}/random?view=${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function fetchRandomImage() {
  try {
    const response = await fetch(randomImageUrl(), { cache: "no-store" });
    if (!response.ok) throw new Error("接口暂时不可用");
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error("返回内容不是图片");
    return URL.createObjectURL(blob);
  } catch {
    return randomImageUrl();
  }
}

function galleryName(tag, index) {
  const seed = galleryNameSeeds[index % galleryNameSeeds.length];
  return `${tag.name} · ${seed} ${index + 1}`;
}

function renderTags() {
  tagGrid.innerHTML = "";
  tags.forEach((tag, index) => {
    const button = document.createElement("button");
    button.className = "tag-card";
    button.type = "button";
    button.setAttribute("aria-label", `查看${tag.name}标签`);
    button.innerHTML = `
      <strong>${tag.name}</strong>
      <span>${tag.tone} · ${GALLERIES_PER_TAG} 个图集</span>
    `;
    button.addEventListener("click", () => openTag(index));
    tagGrid.appendChild(button);
  });
  homeStatus.textContent = "点击标签查看该标签下的所有图集缩略图。";
}

function setView(view) {
  homeView.classList.toggle("active", view === "home");
  tagView.classList.toggle("active", view === "tag");
  readerView.classList.toggle("active", view === "reader");
}

async function openTag(index) {
  activeTagIndex = index;
  const tag = tags[activeTagIndex];
  setView("tag");
  tagEyebrow.textContent = "当前标签";
  tagTitle.textContent = tag.name;
  galleryGrid.innerHTML = "";
  tagStatus.textContent = "正在加载图集缩略图...";

  if (!tag.galleries) {
    tag.galleries = await Promise.all(
      Array.from({ length: GALLERIES_PER_TAG }, async (_, galleryOffset) => ({
        id: `${tag.id}-${galleryOffset}`,
        tagId: tag.id,
        name: galleryName(tag, galleryOffset),
        cover: await fetchRandomImage(),
        images: null,
      })),
    );
  }

  galleries = tag.galleries;
  renderGalleries();
  tagStatus.textContent = `当前标签共有 ${galleries.length} 个图集。`;
}

function renderGalleries() {
  galleryGrid.innerHTML = "";
  galleries.forEach((gallery, index) => {
    const button = document.createElement("button");
    button.className = "gallery-card";
    button.type = "button";
    button.setAttribute("aria-label", `打开${gallery.name}`);
    button.innerHTML = `
      <img src="${gallery.cover}" alt="${gallery.name}" loading="lazy">
      <span class="gallery-name">
        <strong>${gallery.name}</strong>
        <span>${IMAGES_PER_GALLERY} 张</span>
      </span>
    `;
    button.addEventListener("click", () => openReader(index));
    galleryGrid.appendChild(button);
  });
}

async function openReader(nextGalleryIndex, nextImageIndex = 0) {
  galleryIndex = clampIndex(nextGalleryIndex, galleries.length);
  imageIndex = clampIndex(nextImageIndex, IMAGES_PER_GALLERY);
  setView("reader");
  await ensureGalleryImages(galleries[galleryIndex]);
  renderReader();
}

async function ensureGalleryImages(gallery) {
  if (gallery.images) return;
  readerName.textContent = gallery.name;
  readerCount.textContent = "加载中";
  stageCaption.textContent = "正在加载当前图集的所有图片...";
  stageImage.classList.remove("ready");
  stageImage.alt = gallery.name;
  stageImage.src = gallery.cover;
  stageImage.onload = () => stageImage.classList.add("ready");
  const moreImages = await Promise.all(
    Array.from({ length: IMAGES_PER_GALLERY - 1 }, fetchRandomImage),
  );
  gallery.images = [gallery.cover, ...moreImages];
}

function backHome() {
  setView("home");
}

function backToTag() {
  setView("tag");
}

function renderReader() {
  const gallery = galleries[galleryIndex];
  const image = gallery.images[imageIndex];
  readerName.textContent = gallery.name;
  readerCount.textContent = `${imageIndex + 1} / ${gallery.images.length}`;
  stageCaption.textContent = "左右滑动切换图片，按 Esc 返回标签首页";
  stageImage.classList.remove("ready");
  stageImage.alt = `${gallery.name} 第 ${imageIndex + 1} 张`;
  stageImage.onload = () => stageImage.classList.add("ready");
  stageImage.src = image;
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
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 18) {
    moveImage(event.deltaX > 0 ? 1 : -1);
  }
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

function onKeyDown(event) {
  if (event.key === "Escape" && readerView.classList.contains("active")) backToTag();
  if (event.key === "Escape" && tagView.classList.contains("active")) backHome();
  if (!readerView.classList.contains("active")) return;
  if (event.key === "ArrowLeft") moveImage(-1);
  if (event.key === "ArrowRight") moveImage(1);
  if (event.key === "Home") backHome();
}

refreshHome.addEventListener("click", () => {
  tags.forEach((tag) => {
    tag.galleries = null;
  });
  galleries = [];
  renderTags();
});
backToTags.addEventListener("click", backHome);
homeLeft.addEventListener("click", backHome);
homeRight.addEventListener("click", backHome);
prevImage.addEventListener("click", () => moveImage(-1));
nextImage.addEventListener("click", () => moveImage(1));
stage.addEventListener("touchstart", onTouchStart, { passive: true });
stage.addEventListener("touchend", onTouchEnd);
window.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("keydown", onKeyDown);

renderTags();
