document.addEventListener("DOMContentLoaded", function() {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function setStatus(el, msg, kind=""){
    el.textContent = msg;
    el.classList.remove("good","bad","warn");
    if(kind) el.classList.add(kind);
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(e){
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    }
  }

  function nthWeekdayOfMonthUTC(year, monthIndex, weekday, n){
    const first = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const firstDow = first.getUTCDay();
    const delta = (weekday - firstDow + 7) % 7;
    const day = 1 + delta + (n - 1) * 7;
    return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0));
  }

  function nextPatchTuesdayUTC(fromDate){
    const y = fromDate.getUTCFullYear();
    const m = fromDate.getUTCMonth();
    const ptThisMonth = nthWeekdayOfMonthUTC(y, m, 2, 2);
    const endOfPtDay = new Date(Date.UTC(ptThisMonth.getUTCFullYear(), ptThisMonth.getUTCMonth(), ptThisMonth.getUTCDate(), 23, 59, 59));
    if(fromDate <= endOfPtDay) return ptThisMonth;
    const nextMonth = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
    return nthWeekdayOfMonthUTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), 2, 2);
  }

  function fmtYMDUTC(d){
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth()+1).padStart(2,"0");
    const day = String(d.getUTCDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function formatCountdown(ms){
    if(ms <= 0) return "today";
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hrs = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    if(days > 0) return `${days}d ${hrs}h`;
    if(hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  }

  function updateTicker(){
    const now = new Date();
    const nowMs = now.getTime();
    const epochS = Math.floor(nowMs / 1000);
    const utcText = now.toISOString().replace("T"," ").replace("Z"," UTC");
    $("tickUtc").textContent = utcText;
    $("tickEpochS").textContent = String(epochS);
    $("tickEpochMs").textContent = String(nowMs);
    const pt = nextPatchTuesdayUTC(now);
    const msTo = pt.getTime() - nowMs;
    const isTodayUTC = now.getUTCFullYear() === pt.getUTCFullYear() && now.getUTCMonth() === pt.getUTCMonth() && now.getUTCDate() === pt.getUTCDate();
    const when = isTodayUTC ? "today" : `in ${formatCountdown(msTo)}`;
    $("tickPatch").textContent = `Patch Tuesday: ${fmtYMDUTC(pt)} (${when})`;
  }

  $("tickCopyUtcBtn").addEventListener("click", async () => {
    const txt = $("tickUtc").textContent || "";
    const ok = await copyText(txt);
    const btn = $("tickCopyUtcBtn");
    const prev = btn.textContent;
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(()=> btn.textContent = prev, 900);
  });
  $("tickCopyEpochBtn").addEventListener("click", async () => {
    const txt = $("tickEpochS").textContent || "";
    const ok = await copyText(txt);
    const btn = $("tickCopyEpochBtn");
    const prev = btn.textContent;
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(()=> btn.textContent = prev, 900);
  });

  updateTicker();
  setInterval(updateTicker, 1000);

  // Update briefing date on load
  const today = new Date();
  const briefingDate = today.toISOString().split('T')[0];
  const briefingDateEl = $("briefingDate");
  if(briefingDateEl) briefingDateEl.textContent = briefingDate;

  $("openAllBtn").addEventListener("click", () => document.querySelectorAll("details").forEach(d=>d.open=true));
  $("closeAllBtn").addEventListener("click", () => document.querySelectorAll("details").forEach(d=>d.open=false));
  $("clearAllBtn").addEventListener("click", () => {
    ["jyInput","jyJsonOut","jyYamlOut","yfInput","yfOut","subIp","subMask","pwInput"].forEach(id => { if($(id)) $(id).value = ""; });
    setStatus($("subStatus"), "Ready.");
    setStatus($("pwStatusBox"), "Ready.");
    setStatus($("yfWarnBox"), "Ready.");
    $("yfStatus").textContent = "";
    ["subNetwork","subBroadcast","subFirst","subLast","subCidr","subNetmask","subWildcard","subTotal","subUsable"].forEach(id => { if($(id)) $(id).textContent = "—"; });
    resetPwUI();
  });

  document.querySelectorAll(".chip").forEach(ch => {
    ch.addEventListener("click", () => {
      const id = ch.getAttribute("data-jump");
      const el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
    });
  });

  document.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-copy");
      const el = $(id);
      const ok = await copyText(el.value || "");
      const prev = btn.textContent;
      btn.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(()=> btn.textContent = prev, 900);
    });
  });

  document.querySelectorAll("[data-copytext]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-copytext");
      const el = $(id);
      const ok = await copyText(el.textContent || "");
      const prev = btn.textContent;
      btn.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(()=> btn.textContent = prev, 900);
    });
  });

  const jyStatusEl = $("jyStatus");
  function setJYStatus(msg){ jyStatusEl.textContent = msg ? `(${msg})` : ""; }
  function isLikelyJSON(s){ const t = s.trim(); return t.startsWith("{") || t.startsWith("["); }

  function convertJsonYaml(){
    const input = $("jyInput").value.trim();
    $("jyJsonOut").value = "";
    $("jyYamlOut").value = "";
    if(!input){ setJYStatus("paste something"); return; }
    try{
      let obj, mode = "";
      if(isLikelyJSON(input)){
        obj = JSON.parse(input);
        mode = "parsed JSON";
      } else {
        if(typeof jsyaml === "undefined") throw new Error("YAML library not loaded (js-yaml).");
        obj = jsyaml.load(input);
        mode = "parsed YAML";
      }
      $("jyJsonOut").value = JSON.stringify(obj, null, 2);
      $("jyYamlOut").value = (typeof jsyaml !== "undefined") ? jsyaml.dump(obj, { noRefs:true, lineWidth: 120 }) : "YAML support not loaded.";
      setJYStatus(mode);
    }catch(e){ setJYStatus(`error: ${e.message}`); }
  }

  $("jyConvertBtn").addEventListener("click", convertJsonYaml);
  $("jyPrettyBtn").addEventListener("click", () => {
    const v = $("jyInput").value.trim();
    if(!v) return setJYStatus("empty");
    try{ const obj = JSON.parse(v); $("jyInput").value = JSON.stringify(obj, null, 2); setJYStatus("pretty JSON"); }catch(e){ setJYStatus("not valid JSON"); }
  });
  $("jyMinifyBtn").addEventListener("click", () => {
    const v = $("jyInput").value.trim();
    if(!v) return setJYStatus("empty");
    try{ const obj = JSON.parse(v); $("jyInput").value = JSON.stringify(obj); setJYStatus("minified JSON"); }catch(e){ setJYStatus("not valid JSON"); }
  });
  $("jyClearBtn").addEventListener("click", () => {
    $("jyInput").value = "";
    $("jyJsonOut").value = "";
    $("jyYamlOut").value = "";
    setJYStatus("");
  });

  let jyTimer = null;
  $("jyInput").addEventListener("input", () => {
    clearTimeout(jyTimer);
    jyTimer = setTimeout(convertJsonYaml, 350);
  });

  function lintYamlText(yamlText){
    const warnings = [];
    const lines = String(yamlText || "").replace(/\r\n/g, "\n").split("\n");
    for(let i=0;i<lines.length;i++){
      const ln = i + 1;
      const line = lines[i];
      if(/[ \t]+$/.test(line)) warnings.push(`Line ${ln}: trailing whitespace`);
      if(/^\t+/.test(line)) warnings.push(`Line ${ln}: tab indentation found (use spaces)`);
      const leading = line.match(/^[\t ]+/)?.[0] || "";
      if(leading.includes("\t") && leading.includes(" ")) warnings.push(`Line ${ln}: mixed tabs/spaces in indentation`);
      const trimmed = line.trim();
      if(trimmed && !trimmed.startsWith("#")){
        const spacesOnly = leading.replace(/\t/g, "  ");
        const indent = spacesOnly.length;
        if(indent % 2 !== 0) warnings.push(`Line ${ln}: indentation not a multiple of 2 (found ${indent})`);
      }
      if(line.length > 140) warnings.push(`Line ${ln}: very long line (${line.length} chars)`);
    }
    return warnings;
  }

  function setYFStatus(msg, kind=""){
    const el = $("yfStatus");
    el.textContent = msg ? `(${msg})` : "";
    if(msg && $("yfWarnBox")) setStatus($("yfWarnBox"), msg, kind);
  }

  function validateYamlOnly(){
    const input = $("yfInput").value;
    $("yfOut").value = "";
    if(!input.trim()){ setYFStatus("paste YAML", "warn"); setStatus($("yfWarnBox"), "Ready.", ""); return; }
    const warnings = lintYamlText(input);
    try{
      if(typeof jsyaml === "undefined") throw new Error("YAML library not loaded (js-yaml).");
      jsyaml.load(input);
      if(warnings.length){ setStatus($("yfWarnBox"), `Valid YAML. Warnings:\n- ${warnings.join("\n- ")}`, "warn"); setYFStatus("valid (with warnings)", "warn"); }
      else { setStatus($("yfWarnBox"), "Valid YAML. No spacing warnings found.", "good"); setYFStatus("valid", "good"); }
    }catch(e){ setStatus($("yfWarnBox"), `Syntax error: ${e.message}`, "bad"); setYFStatus("syntax error", "bad"); }
  }

  function formatYamlFix(){
    const input = $("yfInput").value;
    $("yfOut").value = "";
    if(!input.trim()){ setYFStatus("paste YAML", "warn"); setStatus($("yfWarnBox"), "Ready.", ""); return; }
    const warnings = lintYamlText(input);
    try{
      if(typeof jsyaml === "undefined") throw new Error("YAML library not loaded (js-yaml).");
      const obj = jsyaml.load(input);
      const out = jsyaml.dump(obj, { indent: 2, noRefs: true, lineWidth: 120, sortKeys: false });
      $("yfOut").value = out;
      if(warnings.length){ setStatus($("yfWarnBox"), `Formatted. Original had warnings:\n- ${warnings.join("\n- ")}`, "warn"); setYFStatus("formatted (warnings existed)", "warn"); }
      else { setStatus($("yfWarnBox"), "Formatted. No spacing warnings found.", "good"); setYFStatus("formatted", "good"); }
    }catch(e){ setStatus($("yfWarnBox"), `Syntax error: ${e.message}`, "bad"); setYFStatus("syntax error", "bad"); }
  }

  $("yfFormatBtn").addEventListener("click", formatYamlFix);
  $("yfValidateBtn").addEventListener("click", validateYamlOnly);
  $("yfClearBtn").addEventListener("click", () => {
    $("yfInput").value = "";
    $("yfOut").value = "";
    $("yfStatus").textContent = "";
    setStatus($("yfWarnBox"), "Ready.");
  });

  let yfTimer = null;
  $("yfInput").addEventListener("input", () => {
    clearTimeout(yfTimer);
    yfTimer = setTimeout(validateYamlOnly, 450);
  });

  function isValidOctet(n){ return Number.isInteger(n) && n >= 0 && n <= 255; }
  function ipv4ToInt(ip){
    const parts = String(ip).trim().split(".");
    if(parts.length !== 4) return null;
    const nums = parts.map(p => Number(p));
    if(nums.some(n => !isValidOctet(n))) return null;
    return ((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + (nums[3] >>> 0);
  }
  function intToIpv4(n){
    const a = (n >>> 24) & 255;
    const b = (n >>> 16) & 255;
    const c = (n >>> 8) & 255;
    const d = n & 255;
    return `${a}.${b}.${c}.${d}`;
  }
  function cidrToMaskInt(cidr){
    if(!Number.isInteger(cidr) || cidr < 0 || cidr > 32) return null;
    if(cidr === 0) return 0 >>> 0;
    return (0xFFFFFFFF << (32 - cidr)) >>> 0;
  }
  function maskIntToCidr(maskInt){
    let seenZero = false, cidr = 0;
    for(let i=31;i>=0;i--){
      const bit = (maskInt >>> i) & 1;
      if(bit === 1){ if(seenZero) return null; cidr++; } else { seenZero = true; }
    }
    return cidr;
  }
  function parseMaskOrCidr(s){
    const t = String(s || "").trim();
    if(!t) return null;
    const slashIdx = t.indexOf("/");
    if(slashIdx !== -1 && slashIdx < t.length - 1){
      const maybe = t.slice(slashIdx + 1).trim();
      if(/^\d{1,2}$/.test(maybe)){
        const cidr = Number(maybe);
        const maskInt = cidrToMaskInt(cidr);
        if(maskInt === null) return null;
        return { cidr, maskInt };
      }
    }
    const m = t.startsWith("/") ? t.slice(1) : t;
    if(/^\d{1,2}$/.test(m)){
      const cidr = Number(m);
      const maskInt = cidrToMaskInt(cidr);
      if(maskInt === null) return null;
      return { cidr, maskInt };
    }
    const maskInt = ipv4ToInt(t);
    if(maskInt === null) return null;
    const cidr = maskIntToCidr(maskInt);
    if(cidr === null) return null;
    return { cidr, maskInt };
  }
  function parseIpAndMask(){
    const ipRaw = $("subIp").value.trim();
    const maskRaw = $("subMask").value.trim();
    let ipPart = ipRaw, maskPart = maskRaw;
    if(ipRaw.includes("/") && !maskRaw){
      const [a,b] = ipRaw.split("/", 2);
      ipPart = a.trim();
      maskPart = "/" + (b || "").trim();
    }
    const ipInt = ipv4ToInt(ipPart);
    if(ipInt === null) return { error: "Invalid IPv4 address." };
    const parsed = parseMaskOrCidr(maskPart);
    if(parsed === null) return { error: "Invalid CIDR or netmask. Try /24 or 255.255.255.0" };
    return { ipInt, cidr: parsed.cidr, maskInt: parsed.maskInt };
  }

  function calcSubnet(){
    const p = parseIpAndMask();
    if(p.error){ setStatus($("subStatus"), p.error, "bad"); return; }
    const { ipInt, cidr, maskInt } = p;
    const wildcardInt = (~maskInt) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;
    const total = 1n << BigInt(32 - cidr);
    let usable, firstInt, lastInt;
    if(cidr === 32){ usable = 1n; firstInt = networkInt; lastInt = networkInt; }
    else if(cidr === 31){ usable = 2n; firstInt = networkInt; lastInt = broadcastInt; }
    else { usable = total - 2n; firstInt = (networkInt + 1) >>> 0; lastInt = (broadcastInt - 1) >>> 0; }
    $("subNetwork").textContent = `${intToIpv4(networkInt)}/${cidr}`;
    $("subBroadcast").textContent = intToIpv4(broadcastInt);
    $("subFirst").textContent = intToIpv4(firstInt);
    $("subLast").textContent = intToIpv4(lastInt);
    $("subCidr").textContent = `/${cidr}`;
    $("subNetmask").textContent = intToIpv4(maskInt);
    $("subWildcard").textContent = intToIpv4(wildcardInt);
    $("subTotal").textContent = String(total);
    $("subUsable").textContent = String(usable);
    setStatus($("subStatus"), "Calculated.", "good");
  }

  function clearSubnet(){
    $("subIp").value = "";
    $("subMask").value = "";
    ["subNetwork","subBroadcast","subFirst","subLast","subCidr","subNetmask","subWildcard","subTotal","subUsable"].forEach(id => $(id).textContent = "—");
    setStatus($("subStatus"), "Ready.");
  }

  $("subCalcBtn").addEventListener("click", calcSubnet);
  $("subSampleBtn").addEventListener("click", () => {
    $("subIp").value = "192.168.20.55";
    $("subMask").value = "/24";
    calcSubnet();
  });
  $("subPasteBtn").addEventListener("click", async () => {
    try{
      const txt = await navigator.clipboard.readText();
      const t = String(txt || "").trim();
      if(!t){ setStatus($("subStatus"), "Clipboard empty.", "warn"); return; }
      if(t.includes("/") && /^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(t)){
        const [ip, cidr] = t.split("/");
        $("subIp").value = ip;
        $("subMask").value = "/" + cidr;
        calcSubnet();
        return;
      }
      setStatus($("subStatus"), "Clipboard does not look like IPv4/CIDR (e.g. 10.0.0.5/16).", "warn");
    }catch(e){ setStatus($("subStatus"), "Clipboard read blocked by browser permissions.", "warn"); }
  });
  $("subClearBtn").addEventListener("click", clearSubnet);
  $("subIp").addEventListener("keydown", (e) => { if(e.key === "Enter"){ e.preventDefault(); calcSubnet(); } });
  $("subMask").addEventListener("keydown", (e) => { if(e.key === "Enter"){ e.preventDefault(); calcSubnet(); } });
  $("subCopySummaryBtn").addEventListener("click", async () => {
    const summary = [`Network: ${$("subNetwork").textContent}`,`Broadcast: ${$("subBroadcast").textContent}`,`Usable: ${$("subUsable").textContent} of ${$("subTotal").textContent}`,`Range: ${$("subFirst").textContent} - ${$("subLast").textContent}`,`Mask: ${$("subNetmask").textContent} (${$("subCidr").textContent})`,`Wildcard: ${$("subWildcard").textContent}`].join("\n");
    const ok = await copyText(summary);
    const btn = $("subCopySummaryBtn");
    const prev = btn.textContent;
    btn.textContent = ok ? "Copied" : "Copy failed";
    setTimeout(()=> btn.textContent = prev, 900);
  });

  function charSpace(pw){ let space = 0; if(/[a-z]/.test(pw)) space += 26; if(/[A-Z]/.test(pw)) space += 26; if(/[0-9]/.test(pw)) space += 10; if(/[^a-zA-Z0-9]/.test(pw)) space += 33; if(/[^\x00-\x7F]/.test(pw)) space += 100; return space; }
  function entropyBits(pw){ const space = Math.max(charSpace(pw), 1); return pw.length * Math.log2(space); }
  function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
  function formatTime(seconds){
    if(!Number.isFinite(seconds) || seconds <= 0) return "—";
    const units = [["year", 60*60*24*365],["day", 60*60*24],["hour", 60*60],["minute", 60],["second", 1]];
    for(const [name, s] of units){ const v = Math.floor(seconds / s); if(v >= 2) return `${v} ${name}s`; if(v === 1) return `1 ${name}`; }
    return "< 1 second";
  }
  function scoreLabel(score){
    if(score < 20) return ["Very weak", "bad"];
    if(score < 40) return ["Weak", "warn"];
    if(score < 60) return ["Okay", "warn"];
    if(score < 80) return ["Strong", "good"];
    return ["Very strong", "good"];
  }

  function resetPwUI(){
    $("pwScore").textContent = "—";
    $("pwEntropy").textContent = "—";
    $("pwCharset").textContent = "—";
    $("pwLength").textContent = "—";
    $("pwT10k").textContent = "—";
    $("pwT1b").textContent = "—";
    $("pwT100b").textContent = "—";
    $("pwBadge").textContent = "—";
    $("pwBarFill").style.width = "0%";
    $("pwBarFill").style.background = "rgba(255,107,107,.9)";
    $("pwTips").innerHTML = "<li>Use 14+ characters.</li><li>Mix upper/lowercase, numbers, symbols.</li><li>Avoid reused or known-breached passwords.</li>";
    $("pwStatus").textContent = "";
  }

  function guessesToTimes(guesses){
    const rates = {"10k guesses/sec": 1e4, "1B guesses/sec": 1e9, "100B guesses/sec": 1e11};
    return { t10k: guesses / rates["10k guesses/sec"], t1b: guesses / rates["1B guesses/sec"], t100b: guesses / rates["100B guesses/sec"] };
  }

  function analyzePassword(pw){
    const tips = [];
    const len = pw.length;
    if(len === 0) return { len: 0, bits: 0, score: 0, label: "—", kind: "", tips: ["Use 14+ characters.", "Mix upper/lowercase, numbers, symbols.", "Avoid reused or known-breached passwords."], t10k: 0, t1b: 0, t100b: 0, spaceLabel: "—" };
    if(typeof zxcvbn === "function"){
      const z = zxcvbn(pw);
      const score = clamp(Math.round((z.score / 4) * 100), 0, 100);
      const [label, kind] = scoreLabel(score);
      const { t10k, t1b, t100b } = guessesToTimes(Math.max(1, z.guesses));
      const zTips = [];
      if(z.feedback){ if(z.feedback.warning) zTips.push(z.feedback.warning); if(Array.isArray(z.feedback.suggestions)) zTips.push(...z.feedback.suggestions); }
      zTips.push("Use a password manager and unique passwords per site.");
      zTips.push("Prefer passphrases (4+ random words) over clever variations.");
      let spaceLabel = [];
      if(/[a-z]/.test(pw)) spaceLabel.push("a-z");
      if(/[A-Z]/.test(pw)) spaceLabel.push("A-Z");
      if(/[0-9]/.test(pw)) spaceLabel.push("0-9");
      if(/[^a-zA-Z0-9]/.test(pw)) spaceLabel.push("symbols");
      if(/[^\x00-\x7F]/.test(pw)) spaceLabel.push("unicode");
      spaceLabel = spaceLabel.join(" + ") || "—";
      const bits = Math.log2(Math.max(1, z.guesses));
      return { len, bits, score, label, kind, tips: [...new Set(zTips)].slice(0, 6), t10k, t1b, t100b, spaceLabel };
    }
    const bits = entropyBits(pw);
    if(len < 14) tips.push("Use 14+ characters (length matters most).");
    if(!/[A-Z]/.test(pw)) tips.push("Add uppercase letters.");
    if(!/[a-z]/.test(pw)) tips.push("Add lowercase letters.");
    if(!/[0-9]/.test(pw)) tips.push("Add numbers.");
    if(!/[^a-zA-Z0-9]/.test(pw)) tips.push("Add symbols.");
    let score = clamp(Math.round(bits / 1.1), 0, 100);
    const [label, kind] = scoreLabel(score);
    const guesses = Math.pow(2, Math.max(bits - 1, 0));
    const { t10k, t1b, t100b } = guessesToTimes(guesses);
    let spaceLabel = [];
    if(/[a-z]/.test(pw)) spaceLabel.push("a-z");
    if(/[A-Z]/.test(pw)) spaceLabel.push("A-Z");
    if(/[0-9]/.test(pw)) spaceLabel.push("0-9");
    if(/[^a-zA-Z0-9]/.test(pw)) spaceLabel.push("symbols");
    if(/[^\x00-\x7F]/.test(pw)) spaceLabel.push("unicode");
    spaceLabel = spaceLabel.join(" + ") || "—";
    const uniqTips = [...new Set(tips)].slice(0, 6);
    if(uniqTips.length === 0) uniqTips.push("Looks good. Prefer unique passwords per site and a password manager.");
    return { len, bits, score, label, kind, tips: uniqTips, t10k, t1b, t100b, spaceLabel };
  }

  function updatePwUI(){
    const pw = $("pwInput").value || "";
    const r = analyzePassword(pw);
    $("pwScore").textContent = String(r.score);
    $("pwEntropy").textContent = r.bits ? r.bits.toFixed(1) : "0.0";
    $("pwCharset").textContent = r.spaceLabel;
    $("pwLength").textContent = String(r.len);
    $("pwT10k").textContent = formatTime(r.t10k);
    $("pwT1b").textContent = formatTime(r.t1b);
    $("pwT100b").textContent = formatTime(r.t100b);
    $("pwBadge").textContent = r.label;
    $("pwBadge").style.borderColor = r.kind === "good" ? "rgba(61,220,151,.45)" : r.kind === "warn" ? "rgba(255,204,102,.55)" : r.kind === "bad" ? "rgba(255,107,107,.45)" : "rgba(34,48,88,.85)";
    $("pwBadge").style.color = r.kind === "good" ? "rgba(61,220,151,.95)" : r.kind === "warn" ? "rgba(255,204,102,.95)" : r.kind === "bad" ? "rgba(255,107,107,.95)" : "rgba(170,182,214,.85)";
    const pct = clamp(r.score, 0, 100);
    $("pwBarFill").style.width = pct + "%";
    $("pwBarFill").style.background = r.kind === "good" ? "rgba(61,220,151,.9)" : r.kind === "warn" ? "rgba(255,204,102,.9)" : "rgba(255,107,107,.9)";
    $("pwTips").innerHTML = (r.tips || []).map(t => `<li>${t}</li>`).join("");
    $("pwStatus").textContent = pw.length ? "(updates locally)" : "";
    setStatus($("pwStatusBox"), pw.length ? "Analyzing locally. Nothing is uploaded." : "Ready.", pw.length ? "good" : "");
  }

  function generatePassword(){
    const lower = "abcdefghjkmnpqrstuvwxyz";
    const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
    const digits = "23456789";
    const symbols = "!@#$%^&*()-_=+[]{};:,.?";
    const all = lower + upper + digits + symbols;
    const pick = (s) => s[Math.floor(Math.random()*s.length)];
    let pw = "";
    pw += pick(lower);
    pw += pick(upper);
    pw += pick(digits);
    pw += pick(symbols);
    for(let i=0;i<14;i++) pw += pick(all);
    const arr = pw.split("");
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join("");
  }

  let pwShown = false;
  $("pwToggleBtn").addEventListener("click", () => {
    pwShown = !pwShown;
    $("pwInput").type = pwShown ? "text" : "password";
    $("pwToggleBtn").textContent = pwShown ? "Hide" : "Show";
  });
  $("pwGenBtn").addEventListener("click", () => {
    $("pwInput").value = generatePassword();
    updatePwUI();
  });
  $("pwCopyBtn").addEventListener("click", async () => {
    const pw = $("pwInput").value || "";
    if(!pw){ setStatus($("pwStatusBox"), "Nothing to copy.", "warn"); return; }
    const ok = await copyText(pw);
    setStatus($("pwStatusBox"), ok ? "Copied password to clipboard." : "Copy failed.", ok ? "good" : "bad");
  });
  $("pwClearBtn").addEventListener("click", () => {
    $("pwInput").value = "";
    resetPwUI();
    setStatus($("pwStatusBox"), "Ready.");
  });
  $("pwInput").addEventListener("input", updatePwUI);

  resetPwUI();
});
