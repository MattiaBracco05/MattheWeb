/*==========================================================================
  custom-fx.js — Layer interattivo del sito (vanilla JS, nessuna dipendenza)
    01. Utility
    02. Cursore custom
    03. Barra di progresso scroll
    04. Particelle hero (canvas)
    05. Typewriter ruoli
    06. Reveal on scroll
    07. Tilt 3D + spotlight sulle card
    09. Contatori & anelli skills
    10. Copia negli appunti + toast
    11. Parallax leggero
    12. Easter egg: drone in volo
    13. Varie (anno footer, HUD altitudine)
===========================================================================*/
(function () {
	"use strict";

	/*----------------------------------------------------------
	  01. Utility
	----------------------------------------------------------*/
	var $ = function (sel, ctx) {
		return (ctx || document).querySelector(sel);
	};
	var $$ = function (sel, ctx) {
		return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
	};
	var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var isDesktop = window.matchMedia("(pointer: fine) and (min-width: 992px)").matches;
	var lerp = function (a, b, t) {
		return a + (b - a) * t;
	};
	var clamp = function (v, min, max) {
		return Math.min(max, Math.max(min, v));
	};

	/* Osservatore "entra in vista" condiviso: niente IntersectionObserver,
	   cosi' il comportamento e' identico su tutti i browser. */
	var watchers = [];
	var watchQueued = false;

	function watch(el, fn) {
		watchers.push({ el: el, fn: fn });
	}

	function checkWatchers() {
		watchQueued = false;
		if (!watchers.length) return;
		var vh = window.innerHeight || document.documentElement.clientHeight;
		for (var i = watchers.length - 1; i >= 0; i--) {
			var w = watchers[i];
			var r = w.el.getBoundingClientRect();
			if (r.top < vh * 0.92 && r.bottom > 0) {
				watchers.splice(i, 1);
				w.fn(w.el);
			}
		}
	}

	function queueCheck() {
		if (watchQueued) return;
		watchQueued = true;
		requestAnimationFrame(checkWatchers);
	}

	function initWatchers() {
		window.addEventListener("scroll", queueCheck, { passive: true });
		window.addEventListener("resize", queueCheck);
		window.addEventListener("load", queueCheck);
		checkWatchers();
		// rete di sicurezza: se i font o le immagini spostano il layout
		setTimeout(checkWatchers, 400);
		setTimeout(checkWatchers, 1600);
	}

	/*----------------------------------------------------------
	  02. Cursore custom
	----------------------------------------------------------*/
	function initCursor() {
		if (!isDesktop || reduceMotion) return;

		var dot = $(".mw-cursor");
		var ring = $(".mw-cursor-ring");
		if (!dot || !ring) return;

		var mx = window.innerWidth / 2;
		var my = window.innerHeight / 2;
		var rx = mx;
		var ry = my;

		document.body.classList.add("mw-has-cursor");

		window.addEventListener("mousemove", function (e) {
			mx = e.clientX;
			my = e.clientY;
			dot.style.transform = "translate3d(" + (mx - 3.5) + "px," + (my - 3.5) + "px,0)";
		});

		window.addEventListener("mousedown", function () {
			ring.classList.add("is-down");
		});
		window.addEventListener("mouseup", function () {
			ring.classList.remove("is-down");
		});
		document.addEventListener("mouseleave", function () {
			document.body.classList.remove("mw-has-cursor");
		});
		document.addEventListener("mouseenter", function () {
			document.body.classList.add("mw-has-cursor");
		});

		// crescita su elementi interattivi
		var hoverables = "a, button, .service-item, .mw-card, .mw-tool, .mw-stat, .mw-ring, .mw-key";
		document.addEventListener("mouseover", function (e) {
			if (e.target.closest && e.target.closest(hoverables)) ring.classList.add("is-hover");
		});
		document.addEventListener("mouseout", function (e) {
			if (e.target.closest && e.target.closest(hoverables)) ring.classList.remove("is-hover");
		});

		(function loop() {
			rx = lerp(rx, mx, 0.16);
			ry = lerp(ry, my, 0.16);
			var size = ring.offsetWidth / 2;
			ring.style.transform = "translate3d(" + (rx - size) + "px," + (ry - size) + "px,0)";
			requestAnimationFrame(loop);
		})();
	}

	/*----------------------------------------------------------
	  03. Barra di progresso scroll
	----------------------------------------------------------*/
	function initProgress() {
		var bar = $(".mw-progress");
		if (!bar) return;
		var ticking = false;

		function update() {
			var h = document.documentElement.scrollHeight - window.innerHeight;
			var p = h > 0 ? window.pageYOffset / h : 0;
			bar.style.transform = "scaleX(" + clamp(p, 0, 1) + ")";
			ticking = false;
		}

		window.addEventListener(
			"scroll",
			function () {
				if (!ticking) {
					ticking = true;
					requestAnimationFrame(update);
				}
			},
			{ passive: true }
		);
		update();
	}

	/*----------------------------------------------------------
	  04. Particelle hero (canvas)
	----------------------------------------------------------*/
	function initParticles() {
		var canvas = $(".mw-particles");
		if (!canvas || reduceMotion) return;

		var hero = canvas.parentElement;
		var ctx = canvas.getContext("2d");
		var dpr = Math.min(window.devicePixelRatio || 1, 2);
		var w = 0;
		var h = 0;
		var nodes = [];
		var pointer = { x: -9999, y: -9999 };
		var visible = true;
		var raf = null;

		function resize() {
			w = hero.offsetWidth;
			h = hero.offsetHeight;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			build();
		}

		function build() {
			var count = clamp(Math.round((w * h) / 16000), 26, 90);
			nodes = [];
			for (var i = 0; i < count; i++) {
				nodes.push({
					x: Math.random() * w,
					y: Math.random() * h,
					vx: (Math.random() - 0.5) * 0.28,
					vy: (Math.random() - 0.5) * 0.28,
					r: Math.random() * 1.6 + 0.7
				});
			}
		}

		function draw() {
			ctx.clearRect(0, 0, w, h);

			for (var i = 0; i < nodes.length; i++) {
				var n = nodes[i];
				n.x += n.vx;
				n.y += n.vy;

				if (n.x < -20) n.x = w + 20;
				if (n.x > w + 20) n.x = -20;
				if (n.y < -20) n.y = h + 20;
				if (n.y > h + 20) n.y = -20;

				// leggera repulsione dal puntatore
				var dxp = n.x - pointer.x;
				var dyp = n.y - pointer.y;
				var dp = Math.sqrt(dxp * dxp + dyp * dyp);
				if (dp < 130 && dp > 0.1) {
					n.x += (dxp / dp) * 0.9;
					n.y += (dyp / dp) * 0.9;
				}

				ctx.beginPath();
				ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(190,170,255,0.55)";
				ctx.fill();

				for (var j = i + 1; j < nodes.length; j++) {
					var m = nodes[j];
					var dx = n.x - m.x;
					var dy = n.y - m.y;
					var d = Math.sqrt(dx * dx + dy * dy);
					if (d < 135) {
						ctx.beginPath();
						ctx.strokeStyle = "rgba(135,80,247," + (0.3 * (1 - d / 135)).toFixed(3) + ")";
						ctx.lineWidth = 1;
						ctx.moveTo(n.x, n.y);
						ctx.lineTo(m.x, m.y);
						ctx.stroke();
					}
				}

				// collegamento al puntatore
				if (dp < 170) {
					ctx.beginPath();
					ctx.strokeStyle = "rgba(34,211,238," + (0.38 * (1 - dp / 170)).toFixed(3) + ")";
					ctx.lineWidth = 1;
					ctx.moveTo(n.x, n.y);
					ctx.lineTo(pointer.x, pointer.y);
					ctx.stroke();
				}
			}

			raf = requestAnimationFrame(draw);
		}

		hero.addEventListener("mousemove", function (e) {
			var rect = hero.getBoundingClientRect();
			pointer.x = e.clientX - rect.left;
			pointer.y = e.clientY - rect.top;
		});
		hero.addEventListener("mouseleave", function () {
			pointer.x = -9999;
			pointer.y = -9999;
		});

		window.addEventListener("resize", function () {
			clearTimeout(resize._t);
			resize._t = setTimeout(resize, 200);
		});

		if ("IntersectionObserver" in window) {
			new IntersectionObserver(function (entries) {
				entries.forEach(function (en) {
					visible = en.isIntersecting;
					if (visible && !raf) {
						raf = requestAnimationFrame(draw);
					} else if (!visible && raf) {
						cancelAnimationFrame(raf);
						raf = null;
					}
				});
			}).observe(hero);
		}

		resize();
		if (!raf) raf = requestAnimationFrame(draw);
	}

	/*----------------------------------------------------------
	  05. Typewriter ruoli
	----------------------------------------------------------*/
	function initTypewriter() {
		var el = $(".mw-roles-text");
		if (!el) return;

		var roles = (el.getAttribute("data-roles") || "").split("|").filter(Boolean);
		if (!roles.length) return;

		if (reduceMotion) {
			el.textContent = roles[0];
			return;
		}

		var i = 0;
		var pos = 0;
		var deleting = false;

		function tick() {
			var word = roles[i];
			pos = deleting ? pos - 1 : pos + 1;
			el.textContent = word.substring(0, pos);

			var delay = deleting ? 45 : 85;
			if (!deleting && pos === word.length) {
				delay = 1700;
				deleting = true;
			} else if (deleting && pos === 0) {
				deleting = false;
				i = (i + 1) % roles.length;
				delay = 320;
			}
			setTimeout(tick, delay);
		}
		setTimeout(tick, 900);
	}

	/*----------------------------------------------------------
	  06. Reveal on scroll
	----------------------------------------------------------*/
	function initReveal() {
		var items = $$(".mw-reveal");
		if (!items.length) return;

		if (reduceMotion) {
			items.forEach(function (el) {
				el.classList.add("is-in");
			});
			return;
		}

		items.forEach(function (el) {
			watch(el, function (target) {
				var d = target.getAttribute("data-delay");
				if (d) target.style.setProperty("--d", d + "s");
				target.classList.add("is-in");
			});
		});
	}

	/*----------------------------------------------------------
	  07. Tilt 3D + spotlight sulle card
	----------------------------------------------------------*/
	function initTilt() {
		var cards = $$("[data-tilt]");
		if (!cards.length) return;

		cards.forEach(function (card) {
			var max = parseFloat(card.getAttribute("data-tilt")) || 6;
			var frame = null;

			function onMove(e) {
				var rect = card.getBoundingClientRect();
				var px = (e.clientX - rect.left) / rect.width;
				var py = (e.clientY - rect.top) / rect.height;

				card.style.setProperty("--mx", px * 100 + "%");
				card.style.setProperty("--my", py * 100 + "%");

				if (!isDesktop || reduceMotion) return;
				if (frame) cancelAnimationFrame(frame);
				frame = requestAnimationFrame(function () {
					var rotY = (px - 0.5) * max * 2;
					var rotX = (0.5 - py) * max * 2;
					card.style.transform =
						"perspective(1100px) rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg) translateY(-6px)";
				});
			}

			function onLeave() {
				if (frame) cancelAnimationFrame(frame);
				card.style.transform = "";
			}

			card.addEventListener("mousemove", onMove);
			card.addEventListener("mouseleave", onLeave);
		});
	}

	/*----------------------------------------------------------
	  09. Contatori & anelli skills
	----------------------------------------------------------*/
	function animateCount(el, to, duration) {
		var start = null;
		var from = 0;
		function step(ts) {
			if (!start) start = ts;
			var p = clamp((ts - start) / duration, 0, 1);
			var eased = 1 - Math.pow(1 - p, 3);
			el.textContent = Math.round(from + (to - from) * eased);
			if (p < 1) requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
	}

	function initCounters() {
		var counters = $$(".mw-count");
		var rings = $$(".mw-ring");

		function runCounter(el) {
			var to = parseInt(el.getAttribute("data-count"), 10) || 0;
			if (reduceMotion) {
				el.textContent = to;
				return;
			}
			animateCount(el, to, 1600);
		}

		function runRing(ring) {
			var level = parseInt(ring.getAttribute("data-level"), 10) || 0;
			if (reduceMotion) {
				ring.style.setProperty("--p", level);
				return;
			}
			var start = null;
			function step(ts) {
				if (!start) start = ts;
				var p = clamp((ts - start) / 1600, 0, 1);
				var eased = 1 - Math.pow(1 - p, 3);
				ring.style.setProperty("--p", (level * eased).toFixed(2));
				if (p < 1) requestAnimationFrame(step);
			}
			requestAnimationFrame(step);
		}

		counters.forEach(function (el) {
			watch(el, runCounter);
		});
		rings.forEach(function (el) {
			watch(el, runRing);
		});
	}

	/*----------------------------------------------------------
	  10. Copia negli appunti + toast
	----------------------------------------------------------*/
	var toastTimer = null;
	function toast(message, icon) {
		var el = $(".mw-toast");
		if (!el) return;
		el.innerHTML = '<i class="bi ' + (icon || "bi-check-circle") + '"></i><span></span>';
		$("span", el).textContent = message;
		el.classList.add("is-on");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () {
			el.classList.remove("is-on");
		}, 2600);
	}

	function copyText(text) {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			return navigator.clipboard.writeText(text);
		}
		return new Promise(function (resolve, reject) {
			try {
				var ta = document.createElement("textarea");
				ta.value = text;
				ta.setAttribute("readonly", "");
				ta.style.position = "fixed";
				ta.style.opacity = "0";
				document.body.appendChild(ta);
				ta.select();
				document.execCommand("copy");
				document.body.removeChild(ta);
				resolve();
			} catch (err) {
				reject(err);
			}
		});
	}

	function initCopy() {
		$$(".mw-copy").forEach(function (btn) {
			btn.addEventListener("click", function (e) {
				e.preventDefault();
				var value = btn.getAttribute("data-copy") || "";
				copyText(value).then(
					function () {
						toast("Copiato: " + value, "bi-clipboard-check");
					},
					function () {
						toast("Copia non riuscita", "bi-exclamation-triangle");
					}
				);
			});
		});
	}

	/*----------------------------------------------------------
	  11. Parallax leggero
	----------------------------------------------------------*/
	function initParallax() {
		if (!isDesktop || reduceMotion) return;
		var targets = $$("[data-parallax]");
		if (!targets.length) return;

		var tx = 0;
		var ty = 0;
		var cx = 0;
		var cy = 0;

		window.addEventListener("mousemove", function (e) {
			tx = e.clientX / window.innerWidth - 0.5;
			ty = e.clientY / window.innerHeight - 0.5;
		});

		(function loop() {
			cx = lerp(cx, tx, 0.06);
			cy = lerp(cy, ty, 0.06);
			targets.forEach(function (el) {
				var s = parseFloat(el.getAttribute("data-parallax")) || 14;
				el.style.transform = "translate3d(" + (-cx * s).toFixed(2) + "px," + (-cy * s).toFixed(2) + "px,0)";
			});
			requestAnimationFrame(loop);
		})();
	}

	/*----------------------------------------------------------
	  12. Easter egg: drone in volo
	----------------------------------------------------------*/
	var flying = false;
	var DRONE_SITE = "https://mydroneview.it/";

	function openDroneSite() {
		// Un <a target="_blank"> apre SEMPRE solo una nuova scheda e lascia
		// intatta quella corrente. (window.open con "noopener" restituisce
		// null anche quando riesce: non si puo' usare per capire se ha aperto.)
		var a = document.createElement("a");
		a.href = DRONE_SITE;
		a.target = "_blank";
		a.rel = "noopener";
		a.style.display = "none";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	/* Sagoma del drone: la stessa della card MyDroneView, in piccolo. */
	function droneSvg() {
		return (
			'<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">' +
			'<defs><linearGradient id="mwFlyBody" x1="0" y1="0" x2="1" y2="1">' +
			'<stop offset="0" stop-color="#32215c"/><stop offset="1" stop-color="#0d0719"/>' +
			"</linearGradient>" +
			'<linearGradient id="mwFlyProp" x1="0" y1="0" x2="1" y2="0">' +
			'<stop offset="0" stop-color="#cbb8ff" stop-opacity="0"/>' +
			'<stop offset="0.5" stop-color="#cbb8ff" stop-opacity="0.9"/>' +
			'<stop offset="1" stop-color="#cbb8ff" stop-opacity="0"/>' +
			"</linearGradient></defs>" +
			// bracci
			'<g stroke="#43316f" stroke-width="9" stroke-linecap="round">' +
			'<line x1="118" y1="72" x2="58" y2="40"/><line x1="182" y1="72" x2="242" y2="40"/>' +
			'<line x1="120" y1="84" x2="72" y2="104"/><line x1="180" y1="84" x2="228" y2="104"/>' +
			"</g>" +
			// motori
			'<g fill="#160d2b" stroke="#7a57e0" stroke-width="2">' +
			'<rect x="46" y="32" width="24" height="14" rx="6"/><rect x="230" y="32" width="24" height="14" rx="6"/>' +
			'<rect x="60" y="96" width="24" height="14" rx="6"/><rect x="216" y="96" width="24" height="14" rx="6"/>' +
			"</g>" +
			// eliche
			'<ellipse class="mw-prop" cx="58" cy="30" rx="46" ry="5" fill="url(#mwFlyProp)"/>' +
			'<ellipse class="mw-prop" cx="242" cy="30" rx="46" ry="5" fill="url(#mwFlyProp)"/>' +
			'<ellipse class="mw-prop" cx="72" cy="94" rx="40" ry="4.5" fill="url(#mwFlyProp)"/>' +
			'<ellipse class="mw-prop" cx="228" cy="94" rx="40" ry="4.5" fill="url(#mwFlyProp)"/>' +
			// corpo
			'<rect x="112" y="60" width="76" height="34" rx="15" fill="url(#mwFlyBody)" stroke="#8750f7" stroke-width="2"/>' +
			'<rect x="124" y="67" width="52" height="7" rx="3.5" fill="#8750f7" fill-opacity="0.4"/>' +
			// gimbal e ottica
			'<path d="M140 93h20v8a10 10 0 0 1-20 0z" fill="#1a1030" stroke="#8750f7" stroke-width="1.5"/>' +
			'<circle cx="150" cy="107" r="9" fill="#0a0617" stroke="#22d3ee" stroke-width="2"/>' +
			'<circle cx="150" cy="107" r="3.4" fill="#22d3ee"/>' +
			// LED
			'<circle cx="120" cy="77" r="3.4" fill="#ff3b5c"/><circle cx="180" cy="77" r="3.4" fill="#7dffce"/>' +
			"</svg>"
		);
	}

	/* Il drone attraversa lo schermo in un lampo e porta su mydroneview.it.
	   Niente scritte: solo il volo. */
	function droneFlyby() {
		if (flying) return;
		flying = true;

		if (reduceMotion) {
			openDroneSite();
			flying = false;
			return;
		}

		var el = document.createElement("div");
		el.className = "mw-flyby";
		el.setAttribute("aria-hidden", "true");
		el.innerHTML = droneSvg();
		document.body.appendChild(el);

		// la scheda si apre mentre il drone sta ancora volando: entro un secondo
		// dal tasto premuto, cosi' il browser non la considera un popup
		setTimeout(openDroneSite, 700);
		setTimeout(function () {
			if (el.parentNode) el.parentNode.removeChild(el);
			flying = false;
		}, 1000);
	}

	function initEasterEgg() {
		document.addEventListener("keydown", function (e) {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			var tag = (e.target && e.target.tagName) || "";
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			if (e.key && e.key.toLowerCase() === "d") droneFlyby();
		});

		$$("[data-flyby]").forEach(function (el) {
			el.addEventListener("click", function (e) {
				e.preventDefault();
				droneFlyby();
			});
		});
	}

	/*----------------------------------------------------------
	  13. Varie
	----------------------------------------------------------*/
	/* Rete di sicurezza: il preloader e' animato da GSAP al "load".
	   Se per qualsiasi motivo quell'animazione non parte, dopo 6s lo togliamo
	   comunque, cosi' la pagina non resta mai coperta. */
	function initPreloaderFailsafe() {
		var pre = $(".preloader");
		if (!pre) return;
		setTimeout(function () {
			if (window.getComputedStyle(pre).display === "none") return;
			pre.style.transition = "opacity 0.5s ease";
			pre.style.opacity = "0";
			setTimeout(function () {
				pre.style.display = "none";
			}, 520);
		}, 6000);
	}

	function initYear() {
		var el = $("#mw-year");
		if (el) el.textContent = new Date().getFullYear();
	}

	function initAltimeter() {
		var el = $(".mw-alt");
		if (!el || reduceMotion) return;
		var base = 118;
		setInterval(function () {
			var v = base + Math.round(Math.sin(Date.now() / 900) * 6 + (Math.random() - 0.5) * 2);
			el.textContent = "ALT " + v + " m";
		}, 450);
	}

	function initMagnetic() {
		if (!isDesktop || reduceMotion) return;
		$$("[data-magnetic]").forEach(function (el) {
			el.addEventListener("mousemove", function (e) {
				var rect = el.getBoundingClientRect();
				var x = e.clientX - rect.left - rect.width / 2;
				var y = e.clientY - rect.top - rect.height / 2;
				el.style.transform = "translate(" + x * 0.22 + "px," + y * 0.3 + "px)";
			});
			el.addEventListener("mouseleave", function () {
				el.style.transform = "";
			});
		});
	}

	/*----------------------------------------------------------
	  Boot
	----------------------------------------------------------*/
	function boot() {
		initCursor();
		initProgress();
		initParticles();
		initTypewriter();
		initReveal();
		initTilt();
		initCounters();
		initCopy();
		initParallax();
		initEasterEgg();
		initYear();
		initAltimeter();
		initMagnetic();
		initPreloaderFailsafe();
		initWatchers();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", boot);
	} else {
		boot();
	}
})();
