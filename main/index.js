import {
  ICONS,
  SOCIALS,
  PROJECTS as STATIC_PROJECTS,
  PH as STATIC_PH,
  POSTS as STATIC_POSTS,
  LISTS as STATIC_LISTS,
} from "./data.js";

var PROJECTS = STATIC_PROJECTS,
  PH = STATIC_PH,
  POSTS = STATIC_POSTS,
  LISTS = STATIC_LISTS;

function esc(x) {
  return String(x == null ? "" : x)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slug(t) {
  return (
    String(t)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "post"
  );
}

function cmsPost(p) {
  function sanitizeInlineHtml(value) {
    var template = document.createElement("template");
    template.innerHTML = String(value == null ? "" : value);
    template.content.querySelectorAll("*").forEach(function (element) {
      var allowed = ["A", "MARK", "U", "S", "STRIKE", "CODE", "B", "STRONG", "I", "EM"];
      if (allowed.indexOf(element.tagName) === -1) {
        element.replaceWith(document.createTextNode(element.textContent));
        return;
      }
      Array.prototype.forEach.call(element.attributes, function (attribute) {
        if (element.tagName === "A" && attribute.name === "href") return;
        if (["target", "rel"].indexOf(attribute.name) !== -1 && element.tagName === "A") return;
        element.removeAttribute(attribute.name);
      });
      if (element.tagName === "A") {
        var href = element.getAttribute("href") || "";
        if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) element.removeAttribute("href");
        element.target = "_blank";
        element.rel = "noopener noreferrer";
      }
    });
    return template.innerHTML;
  }
  function escapeHtml(value) {
    return esc(value == null ? "" : value);
  }
  function nestedList(items, ordered) {
    return (items || []).map(function (item) {
      var text = typeof item === "string" ? item : item.content || "";
      var children = typeof item === "object" && item.items ? nestedList(item.items, ordered) : "";
      return "<li>" + escapeHtml(text) + children + "</li>";
    }).join("");
  }
  function blocksToHtml(data) {
    if (!data || !Array.isArray(data.blocks)) return "";
    return data.blocks.map(function (block) {
      var d = block.data || {};
      if (block.type === "header") {
        var level = Math.min(6, Math.max(1, Number(d.level) || 2));
        return "<h" + level + ">" + sanitizeInlineHtml(d.text) + "</h" + level + ">";
      }
      if (block.type === "paragraph") return "<p>" + sanitizeInlineHtml(d.text) + "</p>";
      if (block.type === "quote") return "<blockquote>" + sanitizeInlineHtml(d.text) + (d.caption ? "<cite>" + escapeHtml(d.caption) + "</cite>" : "") + "</blockquote>";
      if (block.type === "list" || block.type === "nestedlist") {
        var ordered = d.style === "ordered";
        var tag = ordered ? "ol" : "ul";
        return "<" + tag + ">" + nestedList(d.items, ordered) + "</" + tag + ">";
      }
      if (block.type === "checklist") {
        return '<ul class="checklist">' + (d.items || []).map(function (item) {
          return "<li>" + (item.checked ? "☑" : "☐") + " " + escapeHtml(item.text) + "</li>";
        }).join("") + "</ul>";
      }
      if (block.type === "code") return "<pre><code>" + escapeHtml(d.code) + "</code></pre>";
      if (block.type === "table") {
        return "<table>" + (d.content || []).map(function (row, index) {
          var tag = index === 0 && d.withHeadings ? "th" : "td";
          return "<tr>" + row.map(function (cell) { return "<" + tag + ">" + sanitizeInlineHtml(cell) + "</" + tag + ">"; }).join("") + "</tr>";
        }).join("") + "</table>";
      }
      if (block.type === "linkTool") {
        var linkMeta = d.meta || {};
        var linkUrl = d.link || d.url || "";
        return linkUrl ? '<a class="editor-link-preview" href="' + escapeHtml(linkUrl) + '" target="_blank" rel="noopener noreferrer"><strong>' + escapeHtml(linkMeta.title || d.title || linkUrl) + "</strong><span>" + escapeHtml(linkMeta.description || d.description || linkUrl) + "</span></a>" : "";
      }
      if (block.type === "image" || block.type === "inlineImage" || block.type === "simpleImage") {
        var imageUrl = d.file && d.file.url ? d.file.url : d.url || "";
        return imageUrl ? '<figure><img src="' + escapeHtml(imageUrl) + '" alt="' + escapeHtml(d.caption) + '"><figcaption>' + escapeHtml(d.caption) + "</figcaption></figure>" : "";
      }
      if (block.type === "gallery" || block.type === "carousel") {
        return '<div class="' + block.type + '">' + (d.items || []).map(function (item) {
          var url = typeof item === "string" ? item : item.url || "";
          return url ? '<img src="' + escapeHtml(url) + '" alt="">' : "";
        }).join("") + "</div>";
      }
      if (block.type === "embed") return d.embed ? '<iframe src="' + escapeHtml(d.embed) + '" title="' + escapeHtml(d.caption) + '" loading="lazy"></iframe>' : "";
      if (block.type === "attaches") {
        var attachmentUrl = d.file && d.file.url ? d.file.url : d.dataUrl || "";
        return attachmentUrl ? '<a href="' + escapeHtml(attachmentUrl) + '" download="' + escapeHtml(d.name || d.file && d.file.name || "attachment") + '">' + escapeHtml(d.name || d.file && d.file.name || "Download attachment") + "</a>" : "";
      }
      if (block.type === "button") return d.url ? '<a class="btn" href="' + escapeHtml(d.url) + '">' + escapeHtml(d.text || "Open") + "</a>" : "";
      if (block.type === "layout") return '<div class="editor-layout"><div>' + escapeHtml(d.left) + "</div><div>" + escapeHtml(d.right) + "</div></div>";
      if (block.type === "collapsible") return "<details><summary>" + escapeHtml(d.title || "Details") + "</summary><p>" + escapeHtml(d.text) + "</p></details>";
      if (block.type === "drawing" || block.type === "gif") {
        var mediaUrl = d.dataUrl || d.url || "";
        return mediaUrl ? '<img src="' + escapeHtml(mediaUrl) + '" alt="' + escapeHtml(d.caption || block.type) + '">' : "";
      }
      return d.text ? "<p>" + escapeHtml(d.text) + "</p>" : "";
    }).join("");
  }
  return {
    id: slug(p.t),
    d: p.d,
    tags: String(p.tags || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean),
    t: p.t,
    x: p.x,
    body: p.bodyData ? [blocksToHtml(p.bodyData)] : [String(p.body || "").split(/\n\s*\n/).filter(Boolean).map(function (b) {
      b = b.trim();
      return b.slice(0, 3) === "## "
        ? "<h2>" + esc(b.slice(3)) + "</h2>"
        : '<p class="lead">' + esc(b).replace(/\n/g, "<br>") + "</p>";
    }).join("")],
  };
}

function renderLists() {
  var BOOK_WIDTH = 62;
  var tabs = document.querySelector(".ltabs"),
    tr = document.getElementById("ltrack");
  if (!tabs || !tr) return;
  if (!LISTS.length) {
    tabs.innerHTML = "";
    tr.style.transform = "";
    tr.innerHTML = '<p class="empty"><b>No book lists found</b>Add a reading, watching, or gaming list in the CMS.</p>';
    return;
  }
  tr.innerHTML = LISTS.map(function (l, n) {
    var books = l[1] || [];
    return (
      '<div class="slide" role="tabpanel" id="sl' +
      n +
      '"><div class="row">' +
      (books.length ? books.map(function (b, k) {
        return (
          '<div class="sp' +
          (b[5] ? " im" : "") +
          '" role="button" tabindex="0" aria-pressed="false" data-book-index="' +
          k +
          '" aria-label="' +
          esc(b[0]) +
          ", " +
          esc(b[1]) +
          '" title="' +
          esc(b[0]) +
          " - " +
          esc(b[1]) +
          '" style="--c:' +
          esc(b[2]) +
          ";color:" +
          esc(b[4]) +
          ";width:" +
          BOOK_WIDTH +
          'px">' +
          (b[5] ? '<img class="sp-cover" src="' + esc(b[5]) + '" alt="" loading="lazy">' : "") +
          "<b>" +
          esc(b[0]) +
          "</b><small>" +
          esc(b[1]) +
          "</small></div>"
        );
      }).join("") : '<p class="empty"><b>No items in this list yet</b>Add books or albums in the CMS.</p>') +
      "</div></div>"
    );
  }).join("");
  [].forEach.call(tr.querySelectorAll(".sp"), function (book) {
    function toggleBook() {
      var row = book.parentNode,
        selected = book.classList.contains("selected"),
        selectedIndex = Number(book.getAttribute("data-book-index"));
      row.classList.toggle("has-selection", !selected);
      [].forEach.call(row.querySelectorAll(".sp"), function (item) {
        var index = Number(item.getAttribute("data-book-index")),
          active = !selected && item === book,
          distance = Math.min(Math.abs(index - selectedIndex) * 16, 64);
        item.classList.toggle("selected", active);
        item.setAttribute("aria-pressed", active);
        item.style.setProperty(
          "--shift",
          selected || active ? "0px" : index < selectedIndex ? "-" + distance + "px" : distance + "px"
        );
      });
    }
    book.addEventListener("click", toggleBook);
    book.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleBook();
      }
    });
  });
  tabs.innerHTML = LISTS.map(function (l, n) {
    return (
      '<button type="button" role="tab" aria-controls="sl' +
      n +
      '">' +
      esc(l[0]) +
      "</button>"
    );
  }).join("");
  function go(i) {
    tr.style.transform = "translateX(-" + i * 100 + "%)";
    [].forEach.call(tabs.children, function (b, n) {
      b.setAttribute("aria-selected", n === i);
    });
  }
  [].forEach.call(tabs.children, function (b, n) {
    b.onclick = function () { go(n); };
  });
  go(0);
}

function ic(n) {
  return (
    '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' +
    ICONS[n] +
    "</svg>"
  );
}
function socials(el, list) {
  el.innerHTML = list
    .map(function (n) {
      return (
        '<a href="#" aria-label="' +
        n +
        '" onclick="return false">' +
        ic(n) +
        "</a>"
      );
    })
    .join("");
}
socials(document.getElementById("soc1"), SOCIALS.primary);
socials(document.getElementById("soc2"), SOCIALS.footer);

document.getElementById("projects").innerHTML = PROJECTS.map(function (p) {
  return (
    '<a class="proj" href="#projects"><div class="thumb" style="background:' +
    p[2] +
    '"></div><h2>' +
    p[0] +
    "</h2><p>" +
    p[1] +
    "</p></a>"
  );
}).join("");
document.getElementById("photos").innerHTML = PH.map(function (p) {
  return '<i style="height:' + p[1] + "px;background:" + p[0] + '"></i>';
}).join("");
function meta(p) {
  return (
    '<div class="meta"><span>' +
    p.d +
    '</span><span aria-hidden="true">•</span>' +
    p.tags
      .map(function (t) {
        return '<span class="t">#' + t + "</span>";
      })
      .join("") +
    "</div>"
  );
}
document.getElementById("list").innerHTML = POSTS.map(function (p) {
  return (
    '<article class="post">' +
    meta(p) +
    '<h2><a href="#' +
    p.id +
    '">' +
    p.t +
    "</a></h2><p>" +
    p.x +
    "</p></article>"
  );
}).join("");

function showPost(p) {
  document.getElementById("article").innerHTML =
    '<a class="back" href="#writing">← Back to writing</a><div class="cover" role="img" aria-label="Wireframe sketches"></div>' +
    meta(p) +
    "<h1>" +
    p.t +
    "</h1>" +
    p.body.join("") +
    '<div class="share"><span>Share this article</span><div><button aria-label="Copy link">' +
    ic("link") +
    '</button><button aria-label="Share on Twitter">' +
    ic("twitter") +
    '</button><button aria-label="Share on Dribbble">' +
    ic("dribbble") +
    '</button><button aria-label="Share on LinkedIn">' +
    ic("linkedin") +
    "</button></div></div>";
}
function route() {
  var h = (location.hash || "").slice(1),
    post = POSTS.filter(function (p) {
      return p.id === h;
    })[0],
    on = post
      ? ["post"]
      : ["about", "work", "skills", "lists", "writing", "projects", "photography"];
  if (post) showPost(post);
  document.querySelector(".top").style.display = post ? "none" : "";
  document.querySelectorAll(".view").forEach(function (v) {
    v.classList.toggle("on", on.indexOf(v.id.slice(2)) > -1);
  });
  var t = document.getElementById("v-" + h);
  if (t && !post) {
    setOpen(t);
    t.scrollIntoView();
  } else window.scrollTo(0, 0);
}
var ACC = [].slice
  .call(document.querySelectorAll(".view"))
  .filter(function (v) {
    return v.querySelector(":scope>.sh");
  });
function setOpen(s) {
  ACC.forEach(function (a) {
    var o = a === s;
    a.classList.toggle("open", o);
    a.querySelector(".sh button").setAttribute("aria-expanded", o);
  });
}
ACC.forEach(function (a) {
  a.classList.add("acc");
  var h = a.querySelector(".sh");
  h.innerHTML =
    '<button type="button" aria-expanded="false"><span>' +
    h.textContent +
    '</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
  h.firstChild.onclick = function () {
    setOpen(a.classList.contains("open") ? null : a);
  };
});
renderLists();
(function () {
  function wp(p, a, y) {
    var d = "M0 " + y + " Q" + p / 4 + " " + (y - a) + " " + p / 2 + " " + y;
    for (var x = p; x <= 2400; x += p / 2) d += " T" + x + " " + y;
    return d + " V80 H0Z";
  }
  document.querySelector(".waves").innerHTML = [
    [600, 14, 30],
    [400, 10, 42],
    [300, 8, 54],
  ]
    .map(function (c) {
      return (
        '<svg viewBox="0 0 2400 80" preserveAspectRatio="none"><path d="' +
        wp(c[0], c[1], c[2]) +
        '"/></svg>'
      );
    })
    .join("");
})();
(function () {
  var r = document.documentElement,
    b = document.getElementById("tgl"),
    mq = window.matchMedia("(prefers-color-scheme:dark)");
  var S =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var SUN =
      S +
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    MOON = S + '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
  function dark() {
    var t = r.getAttribute("data-theme");
    return t ? t === "dark" : mq.matches;
  }
  function paint() {
    var d = dark();
    b.setAttribute("aria-pressed", d);
    b.title = d ? "Switch to light theme" : "Switch to dark theme";
    b.innerHTML = d ? SUN : MOON;
  }
  try {
    var s = localStorage.getItem("theme");
    if (s) r.setAttribute("data-theme", s);
  } catch (e) {}
  b.onclick = function () {
    var n = dark() ? "light" : "dark";
    r.setAttribute("data-theme", n);
    try {
      localStorage.setItem("theme", n);
    } catch (e) {}
    paint();
  };
  paint();
})();

function applyCms(D) {
  var P = D.profile,
    A = D.about,
    W = D.work;

  document.title = P.name + " — " + P.role;
  document.getElementById("pname").textContent = P.name;
  document.getElementById("pfp").src = P.avatar
    ? (P.avatar === "./pfp.jpg" ? "./main/pfp.jpg" : P.avatar)
    : "./main/pfp.jpg";
  document.getElementById("pfp").alt = P.name;
  var cover = document.querySelector("#cover-wrap img");
  if (cover && P.cover) cover.src = P.cover;
  document.getElementById("pstats").innerHTML = P.stats
    .map(function (x) { return "<li><b>" + esc(x.n) + "</b> " + esc(x.l) + "</li>"; })
    .join("");
  document.getElementById("pbio").innerHTML =
    "<strong>" + esc(P.role) + "</strong> " + P.bio;
  document.getElementById("fname").textContent = P.name;
  document.getElementById("frole").textContent = P.role;
  document.getElementById("fcopy").textContent = "© " + new Date().getFullYear() + " " + P.name;
  document.getElementById("resume").href = "mailto:" + W.email + "?subject=Resume%20request";

  document.getElementById("aboutp").innerHTML = A.paras
    .map(function (x) { return "<p>" + esc(x) + "</p>"; })
    .join("");
  document.getElementById("facts").innerHTML = A.facts
    .map(function (f) { return "<div><span>" + esc(f.k) + "</span>" + esc(f.v) + "</div>"; })
    .join("");
  document.getElementById("jobs").innerHTML = W.jobs
    .map(function (j) {
      return '<li><span class="yr">' + esc(j.yr) + "</span><div><h3>" +
        esc(j.role) + '</h3><p class="co">' + esc(j.co) +
        "</p><p>" + esc(j.desc) + "</p></div></li>";
    })
    .join("");

  var SK = D.skills || {};
  document.getElementById("core-skills").innerHTML = (SK.core || [])
    .map(function (x) { return "<span>" + esc(x) + "</span>"; })
    .join("");
  function iconGroup(id, names) {
    var labels = {
      js:"JavaScript",ts:"TypeScript",py:"Python",java:"Java",go:"Go",rust:"Rust",
      react:"React",nextjs:"Next.js",tailwind:"Tailwind CSS",nodejs:"Node.js",
      nestjs:"NestJS",spring:"Spring",pytorch:"PyTorch",mongodb:"MongoDB",
      postgres:"PostgreSQL",redis:"Redis",rabbitmq:"RabbitMQ",prisma:"Prisma",
      git:"Git",github:"GitHub",vscode:"VS Code",postman:"Postman",linux:"Linux",vercel:"Vercel"
    };
    document.getElementById(id).innerHTML = (names || [])
      .map(function (x) {
        var label = labels[x] || x;
        return '<img src="https://skillicons.dev/icons?i=' + encodeURIComponent(x) +
          '" alt="' + esc(label) + '" title="' + esc(label) + '">';
      }).join("");
  }
  iconGroup("skills-languages", SK.languages);
  iconGroup("skills-frontend", SK.frontend);
  iconGroup("skills-ai", SK.ai);
  iconGroup("skills-tools", SK.tools);

  PROJECTS = D.projects.map(function (p) {
    return [p.t, p.x, "linear-gradient(135deg," + (p.c1 || "#dfe8cf") + "," + (p.c2 || "#8fae5c") + ")", p.img || "", p.url || ""];
  });
  document.getElementById("projects").innerHTML = PROJECTS.length
    ? PROJECTS.map(function (p) {
    var thumb = p[3]
      ? '<div class="thumb im"><img src="' + p[3].replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '" alt=""></div>'
      : '<div class="thumb" style="background:' + p[2] + '"></div>';
    var url = /^https?:\/\//i.test(p[4] || "") ? p[4] : "#projects";
    var external = url !== "#projects" ? ' target="_blank" rel="noopener noreferrer"' : "";
    return '<a class="proj" href="' + esc(url) + '"' + external + ">" + thumb + "<h2>" + esc(p[0]) + "</h2><p>" + esc(p[1]) + "</p></a>";
  }).join("")
    : '<div class="empty"><b>No projects found</b><span>Add projects in the CMS and they will appear here.</span></div>';

  PH = (D.photos || []).filter(function (p) { return p && p.src; }).map(function (p) { return [p.src, 220]; });
  document.getElementById("photos").innerHTML = PH.length
    ? PH.map(function (p) { return '<img src="' + p[0].replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '" alt="" loading="lazy">'; }).join("")
    : '<div class="empty photos-empty"><b>No photos found</b><span>Add photos in the CMS and they will appear here.</span></div>';

  POSTS = (D.posts || []).map(cmsPost);
  document.getElementById("list").innerHTML = POSTS.length
    ? POSTS.map(function (p) {
    return '<article class="post">' + meta(p) + '<h2><a href="#' +
      p.id + '">' + esc(p.t) + "</a></h2><p>" + esc(p.x) + "</p></article>";
  }).join("")
    : '<div class="empty"><b>No writing found</b><span>Add posts in the CMS and they will appear here.</span></div>';

  LISTS = (D.lists || []).map(function (l) {
    return [
      l.name,
      (l.items || []).map(function (b) {
        return [b.t, b.s, b.c || "#dfe8cf", "#d9a066", b.ink || "#1d2d0b", b.img || ""];
      }),
    ];
  });
  renderLists();
  route();
}

fetch("./cms/d0.json")
  .then(function (r) { return r.ok ? r.json() : null; })
  .then(function (defaults) {
    var D = defaults;
    try {
      var saved = localStorage.getItem("portfolio-cms-v1");
      if (saved) D = JSON.parse(saved);
    } catch (e) {}
    if (D) applyCms(D);
  })
  .catch(function () {});

window.addEventListener("storage", function (event) {
  if (event.key !== "portfolio-cms-v1" || !event.newValue) return;
  try {
    applyCms(JSON.parse(event.newValue));
  } catch (e) {
    console.error("Could not apply CMS content update", e);
  }
});

setOpen(document.getElementById("v-about"));
window.addEventListener("hashchange", route);
route();
