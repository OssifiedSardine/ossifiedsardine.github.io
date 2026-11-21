(function () {
  var root = document.documentElement;
  var themeBtn = document.getElementById("theme-toggle");

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function syncThemeColor(theme) {
    var color = theme === "dark" ? "#0f0f0f" : "#ffffff";
    // Safari often ignores in-place attribute edits on theme-color;
    // replacing the <meta> tag forces WebKit to re-read it immediately.
    var oldMeta = document.querySelector('meta[name="theme-color"]');
    if (oldMeta) oldMeta.remove();
    var meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.id = "theme-color-meta";
    meta.content = color;
    document.head.appendChild(meta);
  }

  syncThemeColor(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      syncThemeColor(next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
      if (kellyInstance && reducedMotion) {
        kellyInstance.renderNow();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Ossified Sardine Footer Easter Egg (><+++°>)
     Hover (or click) once: brittle fossil crumbles into scattered bones.
     Re-hover (or click again): bones snap smoothly back into ><+++°>.
     ------------------------------------------------------------------------ */
  var sardineEl = document.getElementById("sardine");
  if (sardineEl && !reducedMotion) {
    var bones = Array.prototype.slice.call(sardineEl.querySelectorAll(".bone"));
    var sardineBroken = false;
    var lastSardineToggle = 0;

    // Base scatter offsets kept compact & leftward-biased so bones never clip viewport right edge
    var baseScatter = [
      { x: -12, y: 4, r: -42 },
      { x: -7, y: 7, r: 28 },
      { x: -4, y: -5, r: -34 },
      { x: -1, y: 6, r: 52 },
      { x: 1, y: -4, r: -26 },
      { x: 2, y: 6, r: 18 },
      { x: 4, y: 3, r: 44 },
    ];

    function toggleSardine(force) {
      var now = performance.now();
      if (!force && now - lastSardineToggle < 280) return;
      lastSardineToggle = now;

      sardineBroken = !sardineBroken;
      sardineEl.classList.toggle("is-broken", sardineBroken);

      bones.forEach(function (bone, i) {
        if (sardineBroken) {
          var b = baseScatter[i] || { x: 0, y: 4, r: 20 };
          var jx = b.x + (Math.random() - 0.5) * 4;
          var jy = b.y + (Math.random() - 0.5) * 3;
          var jr = b.r + (Math.random() - 0.5) * 22;
          bone.style.transitionDelay = i * 14 + "ms";
          bone.style.transform =
            "translate3d(" +
            jx.toFixed(1) +
            "px, " +
            jy.toFixed(1) +
            "px, 0) rotate(" +
            jr.toFixed(1) +
            "deg)";
        } else {
          bone.style.transitionDelay = i * 20 + "ms";
          bone.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
        }
      });
    }

    sardineEl.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      toggleSardine(false);
    });

    sardineEl.addEventListener("click", function () {
      toggleSardine(true);
    });

    sardineEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleSardine(true);
      }
    });
  }

  /* ------------------------------------------------------------------------
     Interactive 3D ASCII Ned Kelly Helmet (after Sidney Nolan, 1946)
     Real-time SDF raymarcher rendered in crisp Geist Mono ASCII.
     Mounted/unmounted cleanly on navigation so there is zero frame hitch.
     ------------------------------------------------------------------------ */
  var kellyInstance = null;

  // Ordered dark -> light for light mode: always stays solid forged iron
  var IRON_LIGHT = "@@##%%WWMM88*+==";
  // Ordered dark -> light for dark mode
  var IRON_DARK = "==+*88MMWW%%##@@";
  // Non-striping airy stipple ramp for cerulean sky & clouds
  var SKY_RAMP = " .·:+*";

  // Strong directional side-top key light
  var lx = 0.72,
    ly = 0.56,
    lz = 0.41;
  var lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
  lx /= lLen;
  ly /= lLen;
  lz /= lLen;

  // Cool fill light from opposite lower-left
  var fx = -0.65,
    fy = -0.25,
    fz = 0.72;
  var fLen = Math.sqrt(fx * fx + fy * fy + fz * fz);
  fx /= fLen;
  fy /= fLen;
  fz /= fLen;

  function sdRoundBox(px, py, pz, bx, by, bz, r) {
    var qx = Math.abs(px) - bx;
    var qy = Math.abs(py) - by;
    var qz = Math.abs(pz) - bz;
    var ox = qx > 0 ? qx : 0;
    var oy = qy > 0 ? qy : 0;
    var oz = qz > 0 ? qz : 0;
    var outside = Math.sqrt(ox * ox + oy * oy + oz * oz);
    var inside = Math.min(Math.max(qx, Math.max(qy, qz)), 0);
    return outside + inside - r;
  }

  function sdBox(px, py, pz, bx, by, bz) {
    var qx = Math.abs(px) - bx;
    var qy = Math.abs(py) - by;
    var qz = Math.abs(pz) - bz;
    var ox = qx > 0 ? qx : 0;
    var oy = qy > 0 ? qy : 0;
    var oz = qz > 0 ? qz : 0;
    return (
      Math.sqrt(ox * ox + oy * oy + oz * oz) +
      Math.min(Math.max(qx, Math.max(qy, qz)), 0)
    );
  }

  function smin(a, b, k) {
    var h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }

  function mapScene(px, py, pz) {
    var hy = py - 0.08;
    var outer = sdRoundBox(px, hy, pz, 0.96, 0.74, 0.46, 0.04);
    var cavity = sdBox(px, hy - 0.06, pz - 0.02, 0.76, 0.56, 0.30);
    var shell = Math.max(outer, -cavity);
    var slit = sdBox(px, hy - 0.21, pz, 0.68, 0.21, 1.2);
    var helmet = Math.max(shell, -slit);
    var neck = sdRoundBox(px, py + 1.02, pz, 0.28, 0.42, 0.24, 0.035);
    return smin(helmet, neck, 0.04);
  }

  function calcNormal(px, py, pz) {
    var e = 0.0022;
    var dx = mapScene(px + e, py, pz) - mapScene(px - e, py, pz);
    var dy = mapScene(px, py + e, pz) - mapScene(px, py - e, pz);
    var dz = mapScene(px, py, pz + e) - mapScene(px, py, pz - e);
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    return [dx / len, dy / len, dz / len];
  }

  function skySample(u, v, t) {
    var drift = t * 0.11;
    var n1 =
      Math.sin(u * 2.4 - drift * 0.5 + Math.cos(v * 2.1 + u * 0.8)) * 0.5 + 0.5;
    var n2 = Math.cos(u * 3.7 - v * 2.9 + drift * 0.35) * 0.5 + 0.5;
    var cloudMask =
      n1 * 0.55 + n2 * 0.25 + (u + 0.35) * 0.38 + (0.15 - v) * 0.26;
    var sky = 1.0 - Math.max(0, Math.min(1, (cloudMask - 0.64) * 2.2));
    sky = Math.max(0, Math.min(1, sky + (v + 0.25) * 0.22));
    return sky;
  }

  // Persist helmet angle across navigations so returning to About feels continuous
  var kellyState = {
    yaw: -0.32,
    pitch: 0.07,
    velYaw: 0,
    velPitch: 0,
    userSpun: false,
  };

  function unmountKelly() {
    if (kellyInstance) {
      kellyInstance.destroy();
      kellyInstance = null;
    }
  }

  function mountKelly() {
    unmountKelly();
    var canvas = document.getElementById("kelly-ascii");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var COLS = 56;
    var ROWS = 34;
    var SIZE = 280;

    var hoverX = 0;
    var hoverY = 0;
    var dragging = false;
    var lastX = 0;
    var lastY = 0;
    var rafId = 0;
    var alive = true;

    function setupCanvas() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(SIZE * dpr);
      canvas.height = Math.round(SIZE * dpr);
      canvas.style.width = SIZE + "px";
      canvas.style.height = SIZE + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
    }

    function render(timeMs) {
      if (!alive) return;
      var t = timeMs * 0.001;
      var isDark = root.getAttribute("data-theme") === "dark";

      if (!dragging) {
        if (kellyState.userSpun) {
          kellyState.yaw += kellyState.velYaw;
          kellyState.pitch += kellyState.velPitch;
          kellyState.velYaw *= 0.94;
          kellyState.velPitch *= 0.94;
          kellyState.pitch = Math.max(-0.8, Math.min(0.8, kellyState.pitch));
        } else if (!reducedMotion) {
          var targetYaw = -0.26 + Math.sin(t * 0.55) * 0.34 + hoverX * 0.45;
          var targetPitch = 0.06 + Math.cos(t * 0.4) * 0.06 + hoverY * 0.25;
          kellyState.yaw += (targetYaw - kellyState.yaw) * 0.07;
          kellyState.pitch += (targetPitch - kellyState.pitch) * 0.07;
        }
      }

      var cy = Math.cos(kellyState.yaw),
        sy = Math.sin(kellyState.yaw);
      var cp = Math.cos(kellyState.pitch),
        sp = Math.sin(kellyState.pitch);

      ctx.fillStyle = isDark ? "#0f0f0f" : "#ffffff";
      ctx.fillRect(0, 0, SIZE, SIZE);

      var cellW = SIZE / COLS;
      var cellH = SIZE / ROWS;
      ctx.font =
        '500 8.5px "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

      var camZ = 3.12;
      var fov = 1.66;
      var ironRamp = isDark ? IRON_DARK : IRON_LIGHT;
      var ironMax = ironRamp.length - 1;
      var skyMax = SKY_RAMP.length - 1;

      for (var row = 0; row < ROWS; row++) {
        var v = 1 - ((row + 0.5) / ROWS) * 2;
        var pyScreen = (row + 0.5) * cellH;

        for (var col = 0; col < COLS; col++) {
          var u = ((col + 0.5) / COLS) * 2 - 1;
          var pxScreen = (col + 0.5) * cellW;

          var rdx = u;
          var rdy = v;
          var rdz = -fov;
          var rLen = Math.sqrt(rdx * rdx + rdy * rdy + rdz * rdz);
          rdx /= rLen;
          rdy /= rLen;
          rdz /= rLen;

          var roy1 = -camZ * sp;
          var roz1 = camZ * cp;
          var rox = roz1 * sy;
          var roy = roy1;
          var roz = roz1 * cy;

          var dy1 = rdy * cp - rdz * sp;
          var dz1 = rdy * sp + rdz * cp;
          var dx = rdx * cy + dz1 * sy;
          var dy = dy1;
          var dz = -rdx * sy + dz1 * cy;

          var dist = 0;
          var hit = false;
          var hx = 0,
            hy = 0,
            hz = 0;

          for (var step = 0; step < 46; step++) {
            hx = rox + dx * dist;
            hy = roy + dy * dist;
            hz = roz + dz * dist;
            var d = mapScene(hx, hy, hz);
            if (d < 0.0025) {
              hit = true;
              break;
            }
            dist += d * 0.92;
            if (dist > 7.0) break;
          }

          if (hit) {
            var n = calcNormal(hx, hy, hz);
            var key = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
            var fill = Math.max(0, n[0] * fx + n[1] * fy + n[2] * fz);

            var hvx = lx - dx,
              hvy = ly - dy,
              hvz = lz - dz;
            var hvLen = Math.sqrt(hvx * hvx + hvy * hvy + hvz * hvz) || 1;
            var spec = Math.pow(
              Math.max(0, (n[0] * hvx + n[1] * hvy + n[2] * hvz) / hvLen),
              10
            );

            var insideBox =
              Math.abs(hx) < 0.82 && Math.abs(hz) < 0.58 && hy > -0.46;
            var ao = insideBox ? 0.55 : 1.0;

            var grain =
              Math.sin(hx * 13 + hy * 9) * Math.cos(hz * 11) * 0.035;

            var lum = Math.max(
              0,
              Math.min(
                1,
                (0.05 + key * 0.68 + fill * 0.16 + spec * 0.42 + grain) * ao
              )
            );

            var idx = Math.round(lum * ironMax);
            var ch = ironRamp.charAt(idx);

            if (isDark) {
              var vDark = Math.round(105 + lum * 145);
              ctx.fillStyle = "rgb(" + vDark + "," + vDark + "," + vDark + ")";
            } else {
              var vLight = Math.round(8 + lum * 68);
              ctx.fillStyle =
                "rgb(" + vLight + "," + vLight + "," + vLight + ")";
            }
            ctx.fillText(ch, pxScreen, pyScreen);
          } else {
            var sky = skySample(u, v, reducedMotion ? 0 : t);
            if (sky > 0.14) {
              var sIdx = Math.min(
                skyMax,
                Math.max(1, Math.round(sky * skyMax))
              );
              var sCh = SKY_RAMP.charAt(sIdx);
              if (isDark) {
                var alphaD = (0.26 + sky * 0.62).toFixed(2);
                ctx.fillStyle = "rgba(58, 166, 224, " + alphaD + ")";
              } else {
                var alphaL = (0.28 + sky * 0.64).toFixed(2);
                ctx.fillStyle = "rgba(15, 126, 188, " + alphaL + ")";
              }
              ctx.fillText(sCh, pxScreen, pyScreen);
            }
          }
        }
      }

      if (!reducedMotion && alive) {
        rafId = requestAnimationFrame(render);
      }
    }

    function onPointerDown(e) {
      dragging = true;
      kellyState.userSpun = true;
      lastX = e.clientX;
      lastY = e.clientY;
      kellyState.velYaw = 0;
      kellyState.velPitch = 0;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add("is-dragging");
    }

    function onPointerMove(e) {
      var rect = canvas.getBoundingClientRect();
      if (dragging) {
        var dx = e.clientX - lastX;
        var dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        kellyState.velYaw = dx * 0.013;
        kellyState.velPitch = dy * 0.011;
        kellyState.yaw += kellyState.velYaw;
        kellyState.pitch = Math.max(
          -0.8,
          Math.min(0.8, kellyState.pitch + kellyState.velPitch)
        );
        if (reducedMotion) render(0);
      } else {
        hoverX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        hoverY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      }
    }

    function endDrag() {
      dragging = false;
      canvas.classList.remove("is-dragging");
    }

    function onPointerLeave() {
      hoverX = 0;
      hoverY = 0;
    }

    function onDblClick() {
      kellyState.userSpun = false;
      kellyState.velYaw = 0;
      kellyState.velPitch = 0;
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("dblclick", onDblClick);
    window.addEventListener("resize", setupCanvas);

    setupCanvas();
    render(performance.now());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (alive && reducedMotion) render(0);
      });
    }

    kellyInstance = {
      renderNow: function () {
        if (alive) render(performance.now());
      },
      destroy: function () {
        alive = false;
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener("resize", setupCanvas);
      },
    };
  }

  mountKelly();

  /* ------------------------------------------------------------------------
     Frictionless Instant Navigation (Prefetch + Zero-Reload Swap)
     Keeps header/footer locked at 60fps, glides the active menu underline,
     and fades only #main-content with 0ms network delay.
     ------------------------------------------------------------------------ */
  if (!window.fetch || !window.DOMParser || !window.history || !history.pushState) {
    return;
  }

  var nav = document.querySelector(".nav");
  var indicator = document.querySelector(".nav-indicator");
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav-link")
  );
  var mainEl = document.getElementById("main-content");
  if (!nav || !mainEl) return;

  var pageCache = new Map();
  var inflight = new Map();
  var navToken = 0;
  var currentAnim = null;

  function normalizePath(pathname) {
    if (!pathname || pathname === "/") return "/";
    return pathname.endsWith("/") ? pathname : pathname + "/";
  }

  function cacheCurrentPage() {
    var key = normalizePath(window.location.pathname);
    pageCache.set(key, {
      title: document.title,
      bodyClass: document.body.className,
      mainHTML: mainEl.innerHTML,
    });
  }

  function positionIndicator(instant) {
    if (!indicator) return;
    var active = nav.querySelector(".nav-link.is-active");
    if (!active) {
      indicator.style.opacity = "0";
      return;
    }
    var navRect = nav.getBoundingClientRect();
    var linkRect = active.getBoundingClientRect();
    var x = linkRect.left - navRect.left;
    var w = linkRect.width;

    if (instant) {
      indicator.classList.remove("is-ready");
    }
    indicator.style.transform = "translate3d(" + x + "px, 0, 0) scaleX(" + w + ")";
    indicator.style.opacity = "1";
    nav.classList.add("has-indicator");

    if (instant) {
      // Force layout before re-enabling transitions so initial placement never animates
      void indicator.offsetWidth;
      indicator.classList.add("is-ready");
    }
  }

  function setActiveNav(pathname) {
    var current = normalizePath(pathname);
    navLinks.forEach(function (link) {
      var url = new URL(link.href, window.location.origin);
      var target = normalizePath(url.pathname);
      var active =
        current === target || (target !== "/" && current.indexOf(target) === 0);
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    positionIndicator(false);
  }

  function fetchPage(urlStr) {
    var url = new URL(urlStr, window.location.origin);
    var key = normalizePath(url.pathname);
    if (pageCache.has(key)) {
      return Promise.resolve(pageCache.get(key));
    }
    if (inflight.has(key)) {
      return inflight.get(key);
    }
    var req = fetch(url.href, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        var ct = res.headers.get("content-type") || "";
        if (ct.indexOf("text/html") === -1) throw new Error("Not HTML");
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var nextMain = doc.getElementById("main-content");
        if (!nextMain) throw new Error("Missing #main-content");
        var entry = {
          title: doc.title,
          bodyClass: doc.body.className,
          mainHTML: nextMain.innerHTML,
        };
        pageCache.set(key, entry);
        inflight.delete(key);
        return entry;
      })
      .catch(function (err) {
        inflight.delete(key);
        throw err;
      });
    inflight.set(key, req);
    return req;
  }

  function isInternalNavigable(anchor) {
    if (!anchor || anchor.tagName !== "A") return false;
    if (anchor.target && anchor.target !== "_self") return false;
    if (anchor.hasAttribute("download")) return false;
    var href = anchor.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
    var url;
    try {
      url = new URL(anchor.href, window.location.origin);
    } catch (e) {
      return false;
    }
    if (url.origin !== window.location.origin) return false;
    if (/\.(xml|pdf|png|jpg|jpeg|webp|svg|ico|zip)$/i.test(url.pathname)) {
      return false;
    }
    return true;
  }

  function navigateTo(urlStr, pushHistory) {
    var url = new URL(urlStr, window.location.origin);
    var targetKey = normalizePath(url.pathname);
    var currentKey = normalizePath(window.location.pathname);
    if (targetKey === currentKey && !url.hash) return;

    var token = ++navToken;
    setActiveNav(url.pathname);

    if (pushHistory) {
      history.pushState({ path: url.pathname }, "", url.href);
    }

    var pagePromise = fetchPage(url.href);

    if (reducedMotion || !mainEl.animate) {
      pagePromise
        .then(function (entry) {
          if (token !== navToken) return;
          unmountKelly();
          document.title = entry.title;
          document.body.className = entry.bodyClass;
          mainEl.innerHTML = entry.mainHTML;
          window.scrollTo(0, 0);
          mountKelly();
        })
        .catch(function () {
          window.location.href = url.href;
        });
      return;
    }

    if (currentAnim) {
      currentAnim.cancel();
      currentAnim = null;
    }

    var outAnim = mainEl.animate(
      [
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
        { opacity: 0, transform: "translate3d(0, -4px, 0)" },
      ],
      {
        duration: 95,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      }
    );
    currentAnim = outAnim;

    var outDone = outAnim.finished.catch(function () {});

    Promise.all([pagePromise, outDone])
      .then(function (results) {
        if (token !== navToken) return;
        var entry = results[0];

        unmountKelly();
        document.title = entry.title;
        document.body.className = entry.bodyClass;
        mainEl.innerHTML = entry.mainHTML;
        window.scrollTo(0, 0);

        // Render first 3D helmet frame synchronously before fading in
        mountKelly();

        outAnim.cancel();
        var inAnim = mainEl.animate(
          [
            { opacity: 0, transform: "translate3d(0, 7px, 0)" },
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
          ],
          {
            duration: 210,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          }
        );
        currentAnim = inAnim;
        inAnim.finished
          .then(function () {
            if (currentAnim === inAnim) currentAnim = null;
          })
          .catch(function () {});
      })
      .catch(function () {
        if (token === navToken) {
          window.location.href = url.href;
        }
      });
  }

  // Intercept internal link clicks
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    var anchor = e.target.closest ? e.target.closest("a") : null;
    if (!isInternalNavigable(anchor)) return;
    e.preventDefault();
    navigateTo(anchor.href, true);
  });

  // Prefetch any internal link on hover/focus (e.g. blog posts)
  function prefetchOnIntent(e) {
    var anchor = e.target.closest ? e.target.closest("a") : null;
    if (!isInternalNavigable(anchor)) return;
    fetchPage(anchor.href).catch(function () {});
  }
  document.addEventListener("pointerenter", prefetchOnIntent, true);
  document.addEventListener("focusin", prefetchOnIntent, true);

  // Handle browser Back / Forward seamlessly
  window.addEventListener("popstate", function () {
    navigateTo(window.location.href, false);
  });

  // Keep underline aligned on resize & after Geist font finishes loading
  window.addEventListener("resize", function () {
    positionIndicator(true);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      positionIndicator(true);
    });
  }

  cacheCurrentPage();
  positionIndicator(true);

  // Silently warm the cache for all 4 top-level pages right after load
  setTimeout(function () {
    navLinks.forEach(function (link) {
      fetchPage(link.href).catch(function () {});
    });
  }, 150);
})();
