(() => {
  // Session-only storage: remembers birthday until tab/window closes OR until session timeout hits.
  // No localStorage. No persistence. Just enough memory to avoid re-typing every click like it's 1997.
  const DEFAULT_MIN = 18;
  const SESSION_KEY_BDAY = "yjs_birthdate";
  const SESSION_KEY_VERIFIED_AT = "yjs_birthdate_verified_at";
  const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes (tweak if you want longer/shorter)

  let sessionAge = 0;
  let pendingNav = null; // { href, target, minAge }

  function getMinAge(){
    const meta = document.querySelector('meta[name="yjs-min-age"]');
    const v = meta ? parseInt(meta.getAttribute("content") || "", 10) : DEFAULT_MIN;
    return Number.isFinite(v) ? v : DEFAULT_MIN;
  }

  function getAge(){ return sessionAge || 0; }
  function setAge(v){ sessionAge = Number.isFinite(v) ? v : 0; }

  function calcAgeFromBirthdate(dateStr){
    // dateStr expected as YYYY-MM-DD (from <input type="date">)
    if (!dateStr || typeof dateStr !== "string") return 0;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return 0;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (![y,m,d].every(Number.isFinite)) return 0;

    const today = new Date();
    let age = today.getFullYear() - y;

    const thisMonth = today.getMonth() + 1;
    const thisDay = today.getDate();
    if (thisMonth < m || (thisMonth === m && thisDay < d)) age -= 1;
    return Math.max(0, age);
  }

  function clearSession(){
    try{
      sessionStorage.removeItem(SESSION_KEY_BDAY);
      sessionStorage.removeItem(SESSION_KEY_VERIFIED_AT);
    }catch(_){}
    setAge(0);
  }

  function loadSession(){
    try{
      const bday = sessionStorage.getItem(SESSION_KEY_BDAY);
      const atRaw = sessionStorage.getItem(SESSION_KEY_VERIFIED_AT);
      const verifiedAt = atRaw ? parseInt(atRaw, 10) : 0;

      if (!bday || !verifiedAt || !Number.isFinite(verifiedAt)) {
        clearSession();
        return false;
      }

      const age = calcAgeFromBirthdate(bday);
      if (!age) {
        clearSession();
        return false;
      }

      const now = Date.now();
      const ageOk = (now - verifiedAt) <= SESSION_TTL_MS;
      if (!ageOk) {
        clearSession();
        return false;
      }

      setAge(age);

      // Auto-expire mid-session if user leaves a tab open forever.
      const remaining = Math.max(1000, SESSION_TTL_MS - (now - verifiedAt));
      window.setTimeout(() => {
        // Only clear if the same verification is still in place
        const cur = sessionStorage.getItem(SESSION_KEY_VERIFIED_AT);
        if (cur && parseInt(cur,10) === verifiedAt) clearSession();
      }, remaining);

      return true;
    }catch(_){
      clearSession();
      return false;
    }
  }

  // Optional: call window.YJS_SIGNOUT() from any "Sign out" button you add.
  window.YJS_SIGNOUT = function(){
    clearSession();
    try{ document.documentElement.style.overflow = ""; }catch(_){}
    window.location.reload();
  };

  function ensureGateMarkup(){
    if (document.getElementById("yjs-agegate")) return;

    const gate = document.createElement("div");
    gate.className = "yjs-agegate";
    gate.id = "yjs-agegate";
    gate.innerHTML = `
      <div class="yjs-agegate__backdrop"></div>
      <div class="yjs-agegate__panel" role="dialog" aria-modal="true" aria-labelledby="yjs-agegate-title">
        <div class="yjs-agegate__sealwrap">
          <img class="yjs-agegate__seal" src="images/seal-of-brine.png" alt="Seal of Brine" />
        </div>

        <h2 id="yjs-agegate-title" class="yjs-agegate__title">Verify your birthday</h2>
        <p id="yjs-agegate-copy" class="yjs-agegate__copy">
          This is an age gate. Enter your birthday to continue.
        </p>

        <form class="yjs-agegate__form" id="yjs-agegate-form">
          <label class="yjs-agegate__label">
            <span class="sr-only">Birthday</span>
            <input class="yjs-agegate__input" id="yjs-agegate-bday" type="date" required />
          </label>
          <button class="yjs-agegate__btn" type="submit">Enter</button>
          <a class="yjs-agegate__btn secondary" href="about:blank">Leave</a>
        </form>

        <div class="yjs-agegate__fine">
          Stored for <strong>this session only</strong> (tab/window). After signout or timeout, you re-enter. Boundaries, but make it efficient.
        </div>
      </div>
    `;

    document.body.appendChild(gate);

    const form = gate.querySelector("#yjs-agegate-form");
    const bdayInput = gate.querySelector("#yjs-agegate-bday");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const bday = (bdayInput && bdayInput.value) ? bdayInput.value : "";
      const age = calcAgeFromBirthdate(bday);
      if (!age) {
        showGate("That date doesn’t look real. Try again.");
        return;
      }

      // Save ONLY for session, with TTL.
      try{
        sessionStorage.setItem(SESSION_KEY_BDAY, bday);
        sessionStorage.setItem(SESSION_KEY_VERIFIED_AT, String(Date.now()));
      }catch(_){}

      setAge(age);
      hideGate();

      // Continue a blocked navigation if that’s why we opened
      if (pendingNav) {
        const { href, target, minAge } = pendingNav;
        pendingNav = null;

        if (getAge() >= minAge) {
          if (target === "_blank") window.open(href, "_blank");
          else window.location.href = href;
        } else {
          showGate(`That content is <strong>${minAge}+</strong>. You are not cleared for that door.`);
        }
      } else {
        // If gate was opened on page load, re-run enforcement once verified.
        enforceMinAge();
      }
    });
  }

  function showGate(message){
    ensureGateMarkup();
    const gate = document.getElementById("yjs-agegate");
    if (!gate) return;

    const copy = gate.querySelector("#yjs-agegate-copy");
    if (copy && typeof message === "string") copy.innerHTML = message;

    gate.classList.add("open");
    document.documentElement.style.overflow = "hidden";

    // focus input (slightly civilized)
    const dobInput = gate.querySelector("#yjs-agegate-bday");
    window.setTimeout(() => dobInput?.focus(), 50);
  }

  function hideGate(){
    const gate = document.getElementById("yjs-agegate");
    if (!gate) return;
    gate.classList.remove("open");
    document.documentElement.style.overflow = "";
  }

  function enforceMinAge(){
    const req = getMinAge();
    const age = getAge();
    if (age >= req) {
      hideGate();
      return true;
    }
    showGate(`This page is <strong>${req}+</strong>. Enter your birthday to continue.`);
    return false;
  }

  function interceptMinAgeLinks(){
    document.querySelectorAll("a[data-min-age], button[data-min-age]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const req = parseInt(el.getAttribute("data-min-age") || "", 10);
        if (!Number.isFinite(req)) return;

        const age = getAge();
        if (age >= req) return; // let it pass

        // Block, then ask for birthday
        let href = null;
        let target = null;
        if (el.tagName.toLowerCase() === "a") {
          href = el.getAttribute("href");
          target = el.getAttribute("target");
        } else {
          href = el.getAttribute("data-href");
          target = el.getAttribute("data-target");
        }
        if (!href) return;

        e.preventDefault();
        e.stopPropagation();

        pendingNav = { href, target, minAge: req };
        showGate(`That link is <strong>${req}+</strong>. Enter your birthday to continue.`);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    interceptMinAgeLinks();

    // Try session storage first (so user doesn't retype constantly)
    loadSession();

    // Oracle Mirror is a reflection tool, not a locked door. Keep it accessible.
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    if (page === 'oracle-mirror.html') {
      // Still set up link interception, but do not enforce the age gate on this page.
      return;
    }


    enforceMinAge();
  });
})(); 