document.addEventListener("DOMContentLoaded", function() {
  "use strict";
  
  // Utility: safe element getter
  function $(id) { return document.getElementById(id); }
  
  // Utility: set status message
  function setStatus(msg, cls) {
    var el = $("status");
    if(el) { el.textContent = msg; el.className = "status " + (cls || ""); }
  }
  
  // Copy to clipboard
  function copyText(text) {
    navigator.clipboard.writeText(text).then(function() {
      setStatus("Copied!", "good");
      setTimeout(function() { setStatus(""); }, 2000);
    }).catch(function() { setStatus("Copy failed", "bad"); });
  }
  
  // YAML mode select
  var yfMode = $("yfMode");
  if(yfMode) {
    yfMode.addEventListener("change", function() {
      console.log("YAML Validation mode:", yfMode.value);
    });
  }
  
  // Clear All button handler - guard against missing IDs
  var clearAllBtn = $("clearAllBtn");
  if(clearAllBtn) {
    clearAllBtn.addEventListener("click", function() {
      var fields = ["yamlInput", "jsonInput", "pwInput"];
      fields.forEach(function(id) {
        var el = $(id);
        if(el) el.value = "";
      });
      setStatus("Cleared");
    });
  }
  
  // Example: format YAML function
  function formatYaml(yaml) {
    if(typeof jsyaml === "undefined") {
      setStatus("js-yaml not loaded", "bad");
      return "";
    }
    try {
      var obj = jsyaml.load(yaml);
      return jsyaml.dump(obj, { indent: 2 });
    } catch(e) {
      setStatus("YAML parse error: " + e.message, "bad");
      return "";
    }
  }
  
  // Example: analyze password function
  function analyzePassword(pwd) {
    if(typeof zxcvbn === "undefined") {
      setStatus("zxcvbn not loaded", "bad");
      return null;
    }
    var result = zxcvbn(pwd);
    var scores = ["Very weak", "Weak", "Fair", "Good", "Very strong"];
    setStatus("Score: " + scores[result.score], result.score >= 3 ? "good" : "warn");
    return result;
  }
  
  // Expose to window for console/event handlers
  window.setStatus = setStatus;
  window.copyText = copyText;
  window.formatYaml = formatYaml;
  window.analyzePassword = analyzePassword;
});
