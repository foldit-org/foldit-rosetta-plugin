const Ne = (e, t) => e === t, ce = {
  equals: Ne
};
let pe = we;
const v = 1, U = 2, ge = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null
};
var g = null;
let W = null, De = null, d = null, w = null, C = null, j = 0;
function Oe(e, t) {
  const n = d, s = g, i = e.length === 0, l = t === void 0 ? s : t, r = i ? ge : {
    owned: null,
    cleanups: null,
    context: l ? l.context : null,
    owner: l
  }, o = i ? e : () => e(() => q(() => M(r)));
  g = r, d = null;
  try {
    return B(o, !0);
  } finally {
    d = n, g = s;
  }
}
function I(e, t) {
  t = t ? Object.assign({}, ce, t) : ce;
  const n = {
    value: e,
    observers: null,
    observerSlots: null,
    comparator: t.equals || void 0
  }, s = (i) => (typeof i == "function" && (i = i(n.value)), ye(n, i));
  return [Le.bind(n), s];
}
function Q(e, t, n) {
  const s = me(e, t, !1, v);
  H(s);
}
function Re(e, t, n) {
  pe = Ie;
  const s = me(e, t, !1, v);
  s.user = !0, C ? C.push(s) : H(s);
}
function q(e) {
  if (d === null) return e();
  const t = d;
  d = null;
  try {
    return e();
  } finally {
    d = t;
  }
}
function fe(e) {
  return g === null || (g.cleanups === null ? g.cleanups = [e] : g.cleanups.push(e)), e;
}
function Le() {
  if (this.sources && this.state)
    if (this.state === v) H(this);
    else {
      const e = w;
      w = null, B(() => G(this), !1), w = e;
    }
  if (d) {
    const e = this.observers;
    if (!e || e[e.length - 1] !== d) {
      const t = e ? e.length : 0;
      d.sources ? (d.sources.push(this), d.sourceSlots.push(t)) : (d.sources = [this], d.sourceSlots = [t]), e ? (e.push(d), this.observerSlots.push(d.sources.length - 1)) : (this.observers = [d], this.observerSlots = [d.sources.length - 1]);
    }
  }
  return this.value;
}
function ye(e, t, n) {
  let s = e.value;
  return (!e.comparator || !e.comparator(s, t)) && (e.value = t, e.observers && e.observers.length && B(() => {
    for (let i = 0; i < e.observers.length; i += 1) {
      const l = e.observers[i], r = W && W.running;
      r && W.disposed.has(l), (r ? !l.tState : !l.state) && (l.pure ? w.push(l) : C.push(l), l.observers && be(l)), r || (l.state = v);
    }
    if (w.length > 1e6)
      throw w = [], new Error();
  }, !1)), t;
}
function H(e) {
  if (!e.fn) return;
  M(e);
  const t = j;
  Me(e, e.value, t);
}
function Me(e, t, n) {
  let s;
  const i = g, l = d;
  d = g = e;
  try {
    s = e.fn(t);
  } catch (r) {
    return e.pure && (e.state = v, e.owned && e.owned.forEach(M), e.owned = null), e.updatedAt = n + 1, Se(r);
  } finally {
    d = l, g = i;
  }
  (!e.updatedAt || e.updatedAt <= n) && (e.updatedAt != null && "observers" in e ? ye(e, s) : e.value = s, e.updatedAt = n);
}
function me(e, t, n, s = v, i) {
  const l = {
    fn: e,
    state: s,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: t,
    owner: g,
    context: g ? g.context : null,
    pure: n
  };
  return g === null || g !== ge && (g.owned ? g.owned.push(l) : g.owned = [l]), l;
}
function k(e) {
  if (e.state === 0) return;
  if (e.state === U) return G(e);
  if (e.suspense && q(e.suspense.inFallback)) return e.suspense.effects.push(e);
  const t = [e];
  for (; (e = e.owner) && (!e.updatedAt || e.updatedAt < j); )
    e.state && t.push(e);
  for (let n = t.length - 1; n >= 0; n--)
    if (e = t[n], e.state === v)
      H(e);
    else if (e.state === U) {
      const s = w;
      w = null, B(() => G(e, t[0]), !1), w = s;
    }
}
function B(e, t) {
  if (w) return e();
  let n = !1;
  t || (w = []), C ? n = !0 : C = [], j++;
  try {
    const s = e();
    return Be(n), s;
  } catch (s) {
    n || (C = null), w = null, Se(s);
  }
}
function Be(e) {
  if (w && (we(w), w = null), e) return;
  const t = C;
  C = null, t.length && B(() => pe(t), !1);
}
function we(e) {
  for (let t = 0; t < e.length; t++) k(e[t]);
}
function Ie(e) {
  let t, n = 0;
  for (t = 0; t < e.length; t++) {
    const s = e[t];
    s.user ? e[n++] = s : k(s);
  }
  for (t = 0; t < n; t++) k(e[t]);
}
function G(e, t) {
  e.state = 0;
  for (let n = 0; n < e.sources.length; n += 1) {
    const s = e.sources[n];
    if (s.sources) {
      const i = s.state;
      i === v ? s !== t && (!s.updatedAt || s.updatedAt < j) && k(s) : i === U && G(s, t);
    }
  }
}
function be(e) {
  for (let t = 0; t < e.observers.length; t += 1) {
    const n = e.observers[t];
    n.state || (n.state = U, n.pure ? w.push(n) : C.push(n), n.observers && be(n));
  }
}
function M(e) {
  let t;
  if (e.sources)
    for (; e.sources.length; ) {
      const n = e.sources.pop(), s = e.sourceSlots.pop(), i = n.observers;
      if (i && i.length) {
        const l = i.pop(), r = n.observerSlots.pop();
        s < i.length && (l.sourceSlots[r] = s, i[s] = l, n.observerSlots[s] = r);
      }
    }
  if (e.tOwned) {
    for (t = e.tOwned.length - 1; t >= 0; t--) M(e.tOwned[t]);
    delete e.tOwned;
  }
  if (e.owned) {
    for (t = e.owned.length - 1; t >= 0; t--) M(e.owned[t]);
    e.owned = null;
  }
  if (e.cleanups) {
    for (t = e.cleanups.length - 1; t >= 0; t--) e.cleanups[t]();
    e.cleanups = null;
  }
  e.state = 0;
}
function Ue(e) {
  return e instanceof Error ? e : new Error(typeof e == "string" ? e : "Unknown error", {
    cause: e
  });
}
function Se(e, t = g) {
  throw Ue(e);
}
function ke(e, t) {
  return q(() => e(t || {}));
}
function Ge(e, t, n) {
  let s = n.length, i = t.length, l = s, r = 0, o = 0, f = t[i - 1].nextSibling, h = null;
  for (; r < i || o < l; ) {
    if (t[r] === n[o]) {
      r++, o++;
      continue;
    }
    for (; t[i - 1] === n[l - 1]; )
      i--, l--;
    if (i === r) {
      const y = l < s ? o ? n[o - 1].nextSibling : n[l - o] : f;
      for (; o < l; ) e.insertBefore(n[o++], y);
    } else if (l === o)
      for (; r < i; )
        (!h || !h.has(t[r])) && t[r].remove(), r++;
    else if (t[r] === n[l - 1] && n[o] === t[i - 1]) {
      const y = t[--i].nextSibling;
      e.insertBefore(n[o++], t[r++].nextSibling), e.insertBefore(n[--l], y), t[i] = n[l];
    } else {
      if (!h) {
        h = /* @__PURE__ */ new Map();
        let b = o;
        for (; b < l; ) h.set(n[b], b++);
      }
      const y = h.get(t[r]);
      if (y != null)
        if (o < y && y < l) {
          let b = r, E = 1, O;
          for (; ++b < i && b < l && !((O = h.get(t[b])) == null || O !== y + E); )
            E++;
          if (E > y - o) {
            const _ = t[r];
            for (; o < y; ) e.insertBefore(n[o++], _);
          } else e.replaceChild(n[o++], t[r++]);
        } else r++;
      else t[r++].remove();
    }
  }
}
const ue = "_$DX_DELEGATE";
function Ve(e, t, n, s = {}) {
  let i;
  return Oe((l) => {
    i = l, t === document ? e() : Ee(t, e(), t.firstChild ? null : void 0, n);
  }, s.owner), () => {
    i(), t.textContent = "";
  };
}
function je(e, t, n, s) {
  let i;
  const l = () => {
    const o = document.createElement("template");
    return o.innerHTML = e, o.content.firstChild;
  }, r = () => (i || (i = l())).cloneNode(!0);
  return r.cloneNode = r, r;
}
function qe(e, t = window.document) {
  const n = t[ue] || (t[ue] = /* @__PURE__ */ new Set());
  for (let s = 0, i = e.length; s < i; s++) {
    const l = e[s];
    n.has(l) || (n.add(l), t.addEventListener(l, Fe));
  }
}
function He(e, t, n) {
  return q(() => e(t, n));
}
function Ee(e, t, n, s) {
  if (n !== void 0 && !s && (s = []), typeof t != "function") return V(e, t, s, n);
  Q((i) => V(e, t(), i, n), s);
}
function Fe(e) {
  let t = e.target;
  const n = `$$${e.type}`, s = e.target, i = e.currentTarget, l = (f) => Object.defineProperty(e, "target", {
    configurable: !0,
    value: f
  }), r = () => {
    const f = t[n];
    if (f && !t.disabled) {
      const h = t[`${n}Data`];
      if (h !== void 0 ? f.call(t, h, e) : f.call(t, e), e.cancelBubble) return;
    }
    return t.host && typeof t.host != "string" && !t.host._$host && t.contains(e.target) && l(t.host), !0;
  }, o = () => {
    for (; r() && (t = t._$host || t.parentNode || t.host); ) ;
  };
  if (Object.defineProperty(e, "currentTarget", {
    configurable: !0,
    get() {
      return t || document;
    }
  }), e.composedPath) {
    const f = e.composedPath();
    l(f[0]);
    for (let h = 0; h < f.length - 2 && (t = f[h], !!r()); h++) {
      if (t._$host) {
        t = t._$host, o();
        break;
      }
      if (t.parentNode === i)
        break;
    }
  } else o();
  l(s);
}
function V(e, t, n, s, i) {
  for (; typeof n == "function"; ) n = n();
  if (t === n) return n;
  const l = typeof t, r = s !== void 0;
  if (e = r && n[0] && n[0].parentNode || e, l === "string" || l === "number") {
    if (l === "number" && (t = t.toString(), t === n))
      return n;
    if (r) {
      let o = n[0];
      o && o.nodeType === 3 ? o.data !== t && (o.data = t) : o = document.createTextNode(t), n = D(e, n, s, o);
    } else
      n !== "" && typeof n == "string" ? n = e.firstChild.data = t : n = e.textContent = t;
  } else if (t == null || l === "boolean")
    n = D(e, n, s);
  else {
    if (l === "function")
      return Q(() => {
        let o = t();
        for (; typeof o == "function"; ) o = o();
        n = V(e, o, n, s);
      }), () => n;
    if (Array.isArray(t)) {
      const o = [], f = n && Array.isArray(n);
      if (X(o, t, n, i))
        return Q(() => n = V(e, o, n, s, !0)), () => n;
      if (o.length === 0) {
        if (n = D(e, n, s), r) return n;
      } else f ? n.length === 0 ? ae(e, o, s) : Ge(e, n, o) : (n && D(e), ae(e, o));
      n = o;
    } else if (t.nodeType) {
      if (Array.isArray(n)) {
        if (r) return n = D(e, n, s, t);
        D(e, n, null, t);
      } else n == null || n === "" || !e.firstChild ? e.appendChild(t) : e.replaceChild(t, e.firstChild);
      n = t;
    }
  }
  return n;
}
function X(e, t, n, s) {
  let i = !1;
  for (let l = 0, r = t.length; l < r; l++) {
    let o = t[l], f = n && n[e.length], h;
    if (!(o == null || o === !0 || o === !1)) if ((h = typeof o) == "object" && o.nodeType)
      e.push(o);
    else if (Array.isArray(o))
      i = X(e, o, f) || i;
    else if (h === "function")
      if (s) {
        for (; typeof o == "function"; ) o = o();
        i = X(e, Array.isArray(o) ? o : [o], Array.isArray(f) ? f : [f]) || i;
      } else
        e.push(o), i = !0;
    else {
      const y = String(o);
      f && f.nodeType === 3 && f.data === y ? e.push(f) : e.push(document.createTextNode(y));
    }
  }
  return i;
}
function ae(e, t, n = null) {
  for (let s = 0, i = t.length; s < i; s++) e.insertBefore(t[s], n);
}
function D(e, t, n, s) {
  if (n === void 0) return e.textContent = "";
  const i = s || document.createTextNode("");
  if (t.length) {
    let l = !1;
    for (let r = t.length - 1; r >= 0; r--) {
      const o = t[r];
      if (i !== o) {
        const f = o.parentNode === e;
        !l && !r ? f ? e.replaceChild(i, o) : e.insertBefore(i, n) : f && o.remove();
      } else l = !0;
    }
  } else e.insertBefore(i, n);
  return [i];
}
const L = (e) => `${e.entity}:${e.index}`, xe = (e, t, n) => [
  (e + 180) / 360 * n,
  n - (t + 180) / 360 * n
];
function Ke(e, t, n) {
  const { size: s, rgb: i } = n, l = document.createElement("canvas");
  l.width = s, l.height = s;
  const r = l.getContext("2d");
  if (r) {
    for (let o = 0; o < s; ++o)
      for (let f = 0; f < s; ++f) {
        const h = (o * s + f) * 3, y = i[h], b = i[h + 1], E = i[h + 2];
        r.fillStyle = `rgb(${y},${b},${E})`, r.fillRect(o, s - 1 - f, 1, 1);
      }
    e.imageSmoothingEnabled = !0, e.drawImage(l, 0, 0, t, t);
  }
}
function We(e, t, n, s, i) {
  for (const l of n) {
    const [r, o] = xe(l.phi, l.psi, t), f = l === i ? 4 : 2.5;
    e.beginPath(), e.fillStyle = "#000", e.arc(r, o, f, 0, Math.PI * 2), e.fill(), s.has(L(l)) && (e.strokeStyle = "#fff", e.lineWidth = 1, e.stroke());
  }
}
function Qe(e, t) {
  const n = t / 2;
  e.strokeStyle = "#777", e.lineWidth = 1, e.beginPath(), e.moveTo(n, 0), e.lineTo(n, t), e.moveTo(0, n), e.lineTo(t, n), e.stroke();
}
function Xe(e, t) {
  const { panelSize: n, grid: s, points: i, selected: l, hover: r } = t, o = e.getContext("2d");
  if (!o) return;
  const f = window.devicePixelRatio || 1;
  e.width = n * f, e.height = n * f, e.style.width = `${n}px`, e.style.height = `${n}px`, o.setTransform(f, 0, 0, f, 0, 0), o.clearRect(0, 0, n, n), s && Ke(o, n, s), We(o, n, i, l, r), Qe(o, n);
}
var Ye = /* @__PURE__ */ je("<div class=rama-root><canvas class=rama-canvas></canvas><div class=rama-footer><span> residues");
const P = 320, Je = 100;
function he(e) {
  const t = e;
  if (!t || typeof t.content != "string") return null;
  try {
    return JSON.parse(atob(t.content));
  } catch {
    return null;
  }
}
function de(e) {
  const t = /* @__PURE__ */ new Set();
  for (const n of e ?? [])
    for (const s of n.residues)
      t.add(L({
        entity: n.entity_id,
        index: s
      }));
  return t;
}
function Ze(e) {
  var oe;
  const t = e.bridge, [n, s] = I(null), [i, l] = I([]), [r, o] = I(null), [f, h] = I(de((oe = t.snapshot().selection) == null ? void 0 : oe.entries)), y = /* @__PURE__ */ new Map(), b = 0, E = (u, c) => {
    const a = y.get(u);
    if (a) {
      c(a);
      return;
    }
    const p = u === b ? {} : {
      aa_index: {
        Int: u
      }
    };
    t.request("plugin_query", {
      query_id: "rama_colors",
      params: p
    }).then((S) => {
      const m = he(S);
      m && (y.set(u, m), c(m));
    }).catch(() => {
    });
  };
  E(b, s);
  const O = () => {
    t.request("plugin_query", {
      query_id: "get_phi_psi",
      params: {}
    }).then((u) => {
      const c = he(u);
      l((c == null ? void 0 : c.residues) ?? []);
    }).catch(() => l([]));
  };
  O();
  let _;
  const Ce = t.subscribe(() => {
    _ && clearTimeout(_), _ = setTimeout(O, Je);
  }, ["score", "history", "scene"]), ve = (u) => {
    if (u.size === 1) {
      const [c] = u, a = i().find((p) => L(p) === c);
      if (a && a.aa >= 1 && a.aa <= 20) {
        E(a.aa, s);
        return;
      }
    }
    E(b, s);
  }, _e = t.subscribe((u) => {
    if (u.selection) {
      const c = de(u.selection.entries);
      h(c), ve(c);
    }
  }, ["selection"]);
  fe(() => {
    _ && clearTimeout(_), Ce(), _e();
  });
  let N;
  Re(() => {
    const u = {
      panelSize: P,
      grid: n(),
      points: i(),
      selected: f(),
      hover: r()
    };
    N && Xe(N, u);
  });
  const Y = (u) => {
    if (!N) return null;
    const c = N.getBoundingClientRect(), a = (u.clientX - c.left) / c.width * P, p = (u.clientY - c.top) / c.height * P;
    return [a, p];
  }, J = (u) => {
    const c = Y(u);
    if (!c) return null;
    const [a, p] = c;
    let S = null, m = 8 * 8;
    for (const K of i()) {
      const [ie, le] = xe(K.phi, K.psi, P), re = (ie - a) * (ie - a) + (le - p) * (le - p);
      re <= m && (m = re, S = K);
    }
    return S;
  };
  let A = null, T = !1, x = null, R = !1, $ = null, Z = 0;
  const Ae = 16, z = (u) => Math.max(-180, Math.min(180, u)), ee = (u, c, a) => {
    const p = L(u);
    l((S) => S.map((m) => L(m) === p ? {
      ...m,
      phi: c,
      psi: a
    } : m));
  }, te = (u, c, a) => {
    Z = Date.now(), t.updateStream(u, {
      angles: {
        Vec3: [c, a, 0]
      }
    });
  }, F = () => {
    A = null, T = !1, x = null, R = !1, $ = null;
  }, ne = (u) => (R = !0, t.cancelStream(u).catch(() => {
  }).finally(F)), Te = (u) => {
    if (R) return;
    const c = J(u);
    c && (t.setSelection([{
      entity_id: c.entity,
      residues: [c.index]
    }]), A = c, T = !1, x = null, $ = null);
  }, $e = (u) => {
    if (o(J(u)), !A || R) return;
    const c = Y(u);
    if (!c) return;
    const a = z(c[0] / P * 360 - 180), p = z((P - c[1]) / P * 360 - 180);
    if (!T) {
      if (A.pose_index == null) return;
      T = !0, $ = [a, p];
      const S = A;
      ee(S, a, p), t.startStream({
        op_id: "ActionSetPhiPsi",
        focused_entity_id: S.entity,
        params: {
          residue: {
            Int: S.pose_index
          }
        }
      }).then((m) => {
        if (!T) {
          ne(m);
          return;
        }
        x = m, $ && te(m, $[0], $[1]);
      }).catch(() => F());
      return;
    }
    if (ee(A, a, p), x == null) {
      $ = [a, p];
      return;
    }
    Date.now() - Z >= Ae && te(x, a, p);
  }, se = () => {
    if (A) {
      if (!T) {
        F();
        return;
      }
      R = !0, T = !1, x != null && ne(x);
    }
  }, Pe = () => {
    o(null), se();
  };
  return fe(() => {
    x != null && t.cancelStream(x).catch(() => {
    });
  }), (() => {
    var u = Ye(), c = u.firstChild, a = c.nextSibling, p = a.firstChild, S = p.firstChild;
    c.addEventListener("mouseleave", Pe), c.$$mouseup = se, c.$$mousemove = $e, c.$$mousedown = Te;
    var m = N;
    return typeof m == "function" ? He(m, c) : N = c, Ee(p, () => i().length, S), u;
  })();
}
qe(["mousedown", "mousemove", "mouseup"]);
const ze = `
:host, .rama-host {
  display: block;
  box-sizing: border-box;
}
.rama-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 360px;
  padding: 8px;
  color: #e5e7eb;
  font: 12px/1.4 system-ui, sans-serif;
}
.rama-canvas {
  background: #f5f5f5;
  cursor: pointer;
  align-self: center;
  border-radius: 4px;
}
.rama-footer {
  position: relative;
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 20px;
  margin-top: 8px;
  align-items: center;
  justify-content: space-between;
  color: #e5e7eb;
}
`, et = 1, tt = (e, t, n) => {
  const s = document.createElement("style");
  s.textContent = ze, t.appendChild(s);
  const i = document.createElement("div");
  i.className = "rama-host", t.appendChild(i);
  const l = Ve(() => ke(Ze, {
    panelId: e,
    bridge: n
  }), i);
  return () => {
    l(), t.replaceChildren();
  };
};
export {
  et as BRIDGE_CONTRACT_VERSION,
  tt as mountPanel
};
