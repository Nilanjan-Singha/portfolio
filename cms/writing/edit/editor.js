const KEY = "portfolio-cms-v1";
const params = new URLSearchParams(location.search);
const postIndex = Number.isInteger(Number(params.get("id"))) ? Number(params.get("id")) : -1;

const titleInput = document.getElementById("post-title");
const dateInput = document.getElementById("post-date");
const tagsInput = document.getElementById("post-tags");
const excerptInput = document.getElementById("post-excerpt");
const documentTitle = document.getElementById("editor-document-title");
const saveStatus = document.getElementById("save-status");

let cmsData = null;
let post = null;
let editor = null;
let saveTimer = null;
let undoStack = [];
let redoStack = [];
let undoPlugin = null;

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function slug(value) {
  return String(value == null ? "" : value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "post";
}

function renderBlockPreview(data) {
  var html = ['<h1>' + esc(titleInput.value.trim() || "Untitled post") + "</h1>"];
  (data.blocks || []).forEach(function (block) {
    var d = block.data || {};
    if (block.type === "header") {
      var level = Math.min(6, Math.max(1, Number(d.level) || 2));
      html.push("<h" + level + ">" + esc(d.text || "") + "</h" + level + ">");
    } else if (block.type === "paragraph") {
      html.push("<p>" + esc(d.text || "") + "</p>");
    } else if (block.type === "quote") {
      html.push("<blockquote>" + esc(d.text || "") + "</blockquote>");
    } else if (block.type === "list" || block.type === "nestedlist") {
      var tag = d.style === "ordered" ? "ol" : "ul";
      var items = (d.items || []).map(function (item) {
        var text = typeof item === "string" ? item : item.content || "";
        return "<li>" + esc(text) + "</li>";
      }).join("");
      html.push("<" + tag + ">" + items + "</" + tag + ">");
    } else if (block.type === "checklist") {
      html.push('<ul class="checklist">' + (d.items || []).map(function (item) {
        return "<li>" + (item.checked ? "☑" : "☐") + " " + esc(item.text || "") + "</li>";
      }).join("") + "</ul>");
    } else if (block.type === "code") {
      html.push("<pre><code>" + esc(d.code || "") + "</code></pre>");
    } else if (block.type === "table") {
      html.push("<table>" + (d.content || []).map(function (row) {
        return "<tr>" + row.map(function (cell) {
          return "<td>" + esc(cell || "") + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</table>");
    } else if (block.type === "image" || block.type === "inlineImage" || block.type === "simpleImage") {
      var imageUrl = d.file && d.file.url ? d.file.url : d.url || "";
      if (imageUrl) html.push('<figure><img src="' + esc(imageUrl) + '" alt=""><figcaption>' + esc(d.caption || "") + "</figcaption></figure>");
    } else if (block.type === "gallery" || block.type === "carousel") {
      html.push('<div class="' + block.type + '">' + (d.items || []).map(function (item) {
        var url = typeof item === "string" ? item : item.url || "";
        return url ? '<img src="' + esc(url) + '" alt="">' : "";
      }).join("") + "</div>");
    } else if (block.type === "embed") {
      if (d.embed) html.push('<iframe src="' + esc(d.embed) + '" title="' + esc(d.caption || "") + '" loading="lazy"></iframe>');
    } else if (block.type === "attaches") {
      var attachmentUrl = d.file && d.file.url ? d.file.url : d.dataUrl || "";
      if (attachmentUrl) html.push('<a href="' + esc(attachmentUrl) + '">' + esc(d.name || d.file && d.file.name || "Download attachment") + "</a>");
    } else if (block.type === "button") {
      if (d.url) html.push('<a class="b2" href="' + esc(d.url) + '">' + esc(d.text || "Open") + "</a>");
    } else if (block.type === "layout") {
      html.push('<div class="editor-layout"><div>' + esc(d.left || "") + "</div><div>" + esc(d.right || "") + "</div></div>");
    } else if (block.type === "collapsible") {
      html.push("<details><summary>" + esc(d.title || "Details") + "</summary><p>" + esc(d.text || "") + "</p></details>");
    } else if (block.type === "drawing" || block.type === "gif") {
      var mediaUrl = d.dataUrl || d.url || "";
      if (mediaUrl) html.push('<img src="' + esc(mediaUrl) + '" alt="">');
    } else if (d.text) {
      html.push("<p>" + esc(d.text) + "</p>");
    }
  });
  return html.join("");
}

async function openPreview() {
  if (!editor) return;
  var data = await editor.save();
  saveStatus.textContent = "Preview ready";
  var modal = document.getElementById("preview-modal");
  var documentPreview = document.getElementById("preview-document");
  documentPreview.innerHTML = renderBlockPreview(data);
  modal.hidden = false;
}

function readCms() {
  try {
    cmsData = JSON.parse(localStorage.getItem(KEY));
  } catch (e) {}
  if (!cmsData || !Array.isArray(cmsData.posts)) {
    fetch("../../d0.json")
      .then(function (response) { return response.json(); })
      .then(function (data) {
        cmsData = data;
        initializePost();
      })
      .catch(function () {
        cmsData = { posts: [] };
        initializePost();
      });
  } else {
    initializePost();
  }
}

function initializePost() {
  cmsData.posts = cmsData.posts || [];
  if (postIndex >= 0 && cmsData.posts[postIndex]) {
    post = cmsData.posts[postIndex];
  } else {
    post = {
      t: "Untitled post",
      d: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      tags: "",
      x: "",
      body: "",
      bodyData: null
    };
    cmsData.posts.unshift(post);
  }
  titleInput.value = post.t || "Untitled post";
  dateInput.value = post.d || "";
  tagsInput.value = post.tags || "";
  excerptInput.value = post.x || "";
  documentTitle.textContent = titleInput.value;
  loadEditor();
}

async function importUrl(url) {
  try {
    var module = await import(url);
    return module.default || module;
  } catch (e) {
    return null;
  }
}

class CustomMediaTool {
  constructor(options) {
    this.data = options.data || {};
  }
  static get toolbox() {
    return { title: "Image", icon: "IMG" };
  }
  render() {
    var root = document.createElement("div");
    root.className = "custom-media-fields";
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Paste image URL";
    input.value = this.data.url || "";
    var file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    var caption = document.createElement("input");
    caption.type = "text";
    caption.placeholder = "Caption";
    caption.value = this.data.caption || "";
    var preview = document.createElement("div");
    preview.className = "custom-media-preview";
    function paint(url) {
      preview.innerHTML = url ? '<img src="' + esc(url) + '" alt="">' : "";
    }
    paint(input.value);
    input.oninput = function () { paint(input.value); };
    file.onchange = function () {
      var selected = file.files[0];
      if (!selected) return;
      var reader = new FileReader();
      reader.onload = function () { input.value = reader.result; paint(reader.result); };
      reader.readAsDataURL(selected);
    };
    root.append(input, file, caption, preview);
    this.elements = { root: root, input: input, caption: caption };
    return root;
  }
  save() {
    return {
      url: this.elements.input.value.trim(),
      caption: this.elements.caption.value.trim()
    };
  }
}

class GalleryTool {
  constructor(options) {
    this.data = options.data || { items: [] };
  }
  static get toolbox() {
    return { title: "Image gallery", icon: "GAL" };
  }
  render() {
    var root = document.createElement("div");
    root.className = "custom-media-fields";
    var urls = document.createElement("textarea");
    urls.rows = 4;
    urls.placeholder = "Image URLs or data URLs, one per line";
    urls.value = (this.data.items || []).join("\n");
    var file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.multiple = true;
    var preview = document.createElement("div");
    preview.className = "custom-carousel-preview";
    function paint() {
      var items = urls.value.split(/\n+/).map(function (url) { return url.trim(); }).filter(Boolean);
      preview.innerHTML = items.map(function (url) { return '<img src="' + esc(url) + '" alt="">'; }).join("");
    }
    paint();
    urls.oninput = paint;
    file.onchange = function () {
      var readers = Array.from(file.files).map(function (selected) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () { resolve(reader.result); };
          reader.readAsDataURL(selected);
        });
      });
      Promise.all(readers).then(function (items) {
        urls.value = (urls.value.trim() ? urls.value.trim() + "\n" : "") + items.join("\n");
        paint();
      });
    };
    root.append(urls, file, preview);
    this.elements = { urls: urls };
    return root;
  }
  save() {
    return {
      items: this.elements.urls.value.split(/\n+/).map(function (url) { return url.trim(); }).filter(Boolean)
    };
  }
}

class CarouselTool extends GalleryTool {
  static get toolbox() {
    return { title: "Carousel", icon: "CRS" };
  }
}

class GifTool {
  constructor(options) { this.data = options.data || {}; }
  static get toolbox() { return { title: "GIF", icon: "GIF" }; }
  render() {
    var root = document.createElement("div");
    root.className = "custom-media-fields";
    var url = document.createElement("input");
    url.type = "url";
    url.placeholder = "GIF or image URL";
    url.value = this.data.url || "";
    var caption = document.createElement("input");
    caption.type = "text";
    caption.placeholder = "Caption";
    caption.value = this.data.caption || "";
    var preview = document.createElement("div");
    preview.className = "custom-media-preview";
    function paint() { preview.innerHTML = url.value ? '<img src="' + esc(url.value) + '" alt="">' : ""; }
    paint();
    url.oninput = paint;
    root.append(url, caption, preview);
    this.elements = { url: url, caption: caption };
    return root;
  }
  save() { return { url: this.elements.url.value.trim(), caption: this.elements.caption.value.trim() }; }
}

class DrawingTool {
  constructor(options) { this.data = options.data || {}; }
  static get toolbox() { return { title: "Drawing", icon: "DRW" }; }
  render() {
    var root = document.createElement("div");
    root.className = "drawing-tool";
    var canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 420;
    var context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (this.data.dataUrl) {
      var image = new Image();
      image.onload = function () { context.drawImage(image, 0, 0, canvas.width, canvas.height); };
      image.src = this.data.dataUrl;
    }
    context.strokeStyle = "#111";
    context.lineWidth = 4;
    context.lineCap = "round";
    var drawing = false;
    function point(event) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * canvas.width / rect.width,
        y: (event.clientY - rect.top) * canvas.height / rect.height
      };
    }
    canvas.onpointerdown = function (event) {
      drawing = true;
      canvas.setPointerCapture(event.pointerId);
      var p = point(event);
      context.beginPath();
      context.moveTo(p.x, p.y);
    };
    canvas.onpointermove = function (event) {
      if (!drawing) return;
      var p = point(event);
      context.lineTo(p.x, p.y);
      context.stroke();
    };
    canvas.onpointerup = function () { drawing = false; };
    root.append(canvas);
    this.elements = { canvas: canvas };
    return root;
  }
  save() { return { dataUrl: this.elements.canvas.toDataURL("image/png") }; }
}

class AttachTool {
  constructor(options) { this.data = options.data || {}; }
  static get toolbox() { return { title: "Attachment", icon: "ATT" }; }
  render() {
    var root = document.createElement("div");
    root.className = "custom-media-fields";
    var file = document.createElement("input");
    file.type = "file";
    var name = document.createElement("input");
    name.type = "text";
    name.placeholder = "Attachment label";
    name.value = this.data.name || "";
    root.append(file, name);
    this.elements = { file: file, name: name, dataUrl: this.data.dataUrl || "", dataName: this.data.name || "" };
    file.onchange = function () {
      var selected = file.files[0];
      if (!selected) return;
      var reader = new FileReader();
      reader.onload = function () {
        this.elements.dataUrl = reader.result;
        this.elements.dataName = selected.name;
        if (!name.value) name.value = selected.name;
      }.bind(this);
      reader.readAsDataURL(selected);
    }.bind(this);
    return root;
  }
  save() {
    return { name: this.elements.name.value.trim() || this.elements.dataName, dataUrl: this.elements.dataUrl };
  }
}

class ButtonTool {
  constructor(options) { this.data = options.data || {}; }
  static get toolbox() { return { title: "Button", icon: "BTN" }; }
  render() {
    var root = document.createElement("div");
    root.className = "custom-media-fields";
    var text = document.createElement("input");
    text.placeholder = "Button text";
    text.value = this.data.text || "Learn more";
    var url = document.createElement("input");
    url.type = "url";
    url.placeholder = "https://";
    url.value = this.data.url || "";
    root.append(text, url);
    this.elements = { text: text, url: url };
    return root;
  }
  save() { return { text: this.elements.text.value.trim(), url: this.elements.url.value.trim() }; }
}

class LayoutTool {
  constructor(options) { this.data = options.data || { left: "", right: "" }; }
  static get toolbox() { return { title: "Two-column layout", icon: "LAY" }; }
  render() {
    var root = document.createElement("div");
    root.className = "custom-layout-fields";
    var left = document.createElement("textarea");
    left.placeholder = "Left column";
    left.value = this.data.left || "";
    var right = document.createElement("textarea");
    right.placeholder = "Right column";
    right.value = this.data.right || "";
    root.append(left, right);
    this.elements = { left: left, right: right };
    return root;
  }
  save() { return { left: this.elements.left.value, right: this.elements.right.value }; }
}

class CollapsibleTool {
  constructor(options) { this.data = options.data || {}; }
  static get toolbox() { return { title: "Collapsible", icon: "COL" }; }
  render() {
    var root = document.createElement("div");
    root.className = "custom-collapsible-fields";
    var title = document.createElement("input");
    title.placeholder = "Title";
    title.value = this.data.title || "";
    var text = document.createElement("textarea");
    text.placeholder = "Content";
    text.value = this.data.text || "";
    root.append(title, text);
    this.elements = { title: title, text: text };
    return root;
  }
  save() { return { title: this.elements.title.value.trim(), text: this.elements.text.value }; }
}

class MarkerInline {
  static get isInline() { return true; }
  static get title() { return "Marker"; }
  render() {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "M";
    return button;
  }
  surround(range) {
    var mark = document.createElement("mark");
    try {
      range.surroundContents(mark);
    } catch (e) {}
  }
  checkState() { return false; }
}

class UnderlineInline {
  static get isInline() { return true; }
  static get title() { return "Underline"; }
  render() {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "U";
    button.style.textDecoration = "underline";
    return button;
  }
  surround(range) {
    var underline = document.createElement("u");
    try {
      range.surroundContents(underline);
    } catch (e) {}
  }
  checkState() { return false; }
}

class StrikethroughInline {
  static get isInline() { return true; }
  static get title() { return "Strikethrough"; }
  render() {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "S";
    button.style.textDecoration = "line-through";
    return button;
  }
  surround(range) {
    var strike = document.createElement("s");
    try {
      range.surroundContents(strike);
    } catch (e) {}
  }
  checkState() { return false; }
}

class HyperlinkInline {
  static get isInline() { return true; }
  static get title() { return "Hyperlink"; }
  render() {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "🔗";
    return button;
  }
  surround(range) {
    var url = prompt("Enter URL");
    if (!url) return;
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    try { range.surroundContents(anchor); } catch (e) {}
  }
  checkState() { return false; }
}

class LinkPreviewTool {
  constructor(options) { this.data = options.data || {}; }
  static get toolbox() { return { title: "Link", icon: "LINK" }; }
  render() {
    var root = document.createElement("div");
    root.className = "custom-media-fields";
    var url = document.createElement("input");
    url.type = "url";
    url.placeholder = "https://";
    url.value = this.data.link || this.data.url || "";
    var title = document.createElement("input");
    title.type = "text";
    title.placeholder = "Link title";
    title.value = this.data.title || "";
    var description = document.createElement("input");
    description.type = "text";
    description.placeholder = "Description";
    description.value = this.data.description || "";
    root.append(url, title, description);
    this.elements = { url: url, title: title, description: description };
    return root;
  }
  save() {
    return {
      link: this.elements.url.value.trim(),
      title: this.elements.title.value.trim(),
      description: this.elements.description.value.trim()
    };
  }
}

async function loadEditor() {
  var modules = await Promise.all([
    importUrl("https://esm.sh/@editorjs/editorjs@2.30.8"),
    importUrl("https://esm.sh/@editorjs/header@2.8.8"),
    importUrl("https://esm.sh/@editorjs/list@2.0.6"),
    importUrl("https://esm.sh/@editorjs/nested-list@1.4.3"),
    importUrl("https://esm.sh/@editorjs/checklist@1.6.0"),
    importUrl("https://esm.sh/@editorjs/embed@2.7.6"),
    importUrl("https://esm.sh/@editorjs/table@2.4.4"),
    importUrl("https://esm.sh/@editorjs/code@2.9.3"),
    importUrl("https://esm.sh/@editorjs/quote@2.7.3"),
    importUrl("https://esm.sh/@editorjs/inline-code@1.5.1"),
    importUrl("https://esm.sh/editorjs-drag-drop@1.1.16"),
    importUrl("https://esm.sh/editorjs-undo@2.0.28"),
    importUrl("https://esm.sh/@editorjs/underline@1.0.2"),
    importUrl("https://esm.sh/@sotaproject/strikethrough@1.0.1"),
    importUrl("https://esm.sh/@editorjs/simple-image@1.6.0")
  ]);
  var EditorJS = modules[0];
  if (!EditorJS) {
    saveStatus.textContent = "Editor failed to load";
    document.getElementById("editorjs").innerHTML = '<p>The Editor.js package could not be loaded. Check your connection and retry.</p>';
    return;
  }
  var tools = {
    paragraph: {},
    header: modules[1] ? {
      class: modules[1],
      config: { placeholder: "Heading", levels: [1, 2, 3], defaultLevel: 2 }
    } : undefined,
    list: modules[2] || undefined,
    nestedlist: modules[3] || undefined,
    checklist: modules[4] || undefined,
    embed: modules[5] || undefined,
    table: modules[6] || undefined,
    code: modules[7] || undefined,
    quote: modules[8] || undefined,
    inlineCode: modules[9] || undefined,
    marker: MarkerInline,
    underline: modules[12] || UnderlineInline,
    strikethrough: modules[13] || StrikethroughInline,
    hyperlink: HyperlinkInline,
    image: CustomMediaTool,
    simpleImage: modules[14] || undefined,
    linkTool: LinkPreviewTool,
    inlineImage: CustomMediaTool,
    gallery: GalleryTool,
    carousel: CarouselTool,
    gif: GifTool,
    drawing: DrawingTool,
    attaches: AttachTool,
    button: ButtonTool,
    layout: LayoutTool,
    collapsible: CollapsibleTool
  };
  Object.keys(tools).forEach(function (name) {
    if (!tools[name]) delete tools[name];
  });
  var initialData = post.bodyData && post.bodyData.blocks
    ? post.bodyData
    : { blocks: [{ type: "paragraph", data: { text: post.body || "" } }] };
  editor = new EditorJS({
    holder: "editorjs",
    data: initialData,
    placeholder: "Write something...",
    tools: tools,
    onChange: queueSave
  });

  if (modules[10]) {
    editor.isReady.then(function () {
      if (typeof modules[10] === "function") new modules[10](editor);
    });
  }
  if (modules[11]) {
    editor.isReady.then(function () {
      if (typeof modules[11] === "function") {
        undoPlugin = new modules[11]({ editor: editor });
      }
    });
  }

  titleInput.oninput = function () {
    documentTitle.textContent = titleInput.value || "Untitled post";
    queueSave();
  };
  dateInput.oninput = queueSave;
  tagsInput.oninput = queueSave;
  excerptInput.oninput = queueSave;

  document.getElementById("undo-button").onclick = function () {
    if (undoPlugin && typeof undoPlugin.undo === "function") undoPlugin.undo();
  };
  document.getElementById("redo-button").onclick = function () {
    if (undoPlugin && typeof undoPlugin.redo === "function") undoPlugin.redo();
  };
  document.getElementById("save-button").onclick = savePost;
  document.getElementById("preview-button").onclick = openPreview;
  document.getElementById("close-preview-button").onclick = function () {
    document.getElementById("preview-modal").hidden = true;
  };
  document.getElementById("collapse-details").onclick = function () {
    var meta = document.querySelector(".editor-meta");
    var shell = document.querySelector(".editor-shell");
    var button = document.getElementById("collapse-details");
    var collapsed = meta.classList.toggle("collapsed");
    shell.classList.toggle("details-collapsed", collapsed);
    button.setAttribute("aria-expanded", !collapsed);
    button.setAttribute("aria-label", collapsed ? "Expand post details" : "Collapse post details");
  };
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") document.getElementById("preview-modal").hidden = true;
  });
  editor.isReady.then(function () { saveStatus.textContent = "Ready"; });
}

async function savePost() {
  if (!editor || !post) return;
  saveStatus.textContent = "Saving...";
  var data = await editor.save();
  post.t = titleInput.value.trim() || "Untitled post";
  post.d = dateInput.value.trim();
  post.tags = tagsInput.value.trim();
  post.x = excerptInput.value.trim();
  post.bodyData = data;
  post.body = "";
  try {
    localStorage.setItem(KEY, JSON.stringify(cmsData));
    saveStatus.textContent = "Saved locally";
  } catch (e) {
    saveStatus.textContent = "Could not save";
  }
}

function queueSave() {
  saveStatus.textContent = "Unsaved";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(savePost, 650);
}

readCms();
