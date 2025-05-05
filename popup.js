const wageInput = document.getElementById("wage");
const showLifeTextToggle = document.getElementById("showLifeText");
const customMessageInput = document.getElementById("customMessage");
const textColorInput = document.getElementById("textColor");
const bgColorInput = document.getElementById("bgColor");
const borderColorInput = document.getElementById("borderColor");
const textColorPreview = document.getElementById("textColorPreview");
const bgColorPreview = document.getElementById("bgColorPreview");
const borderColorPreview = document.getElementById("borderColorPreview");
const saveButton = document.getElementById("save");
const statusDiv = document.getElementById("status");

// Update color previews
function updateColorPreviews() {
  textColorPreview.style.backgroundColor = textColorInput.value;
  bgColorPreview.style.backgroundColor = bgColorInput.value;
  borderColorPreview.style.backgroundColor = borderColorInput.value;
}

// Set up live preview updates
textColorInput.addEventListener("input", updateColorPreviews);
bgColorInput.addEventListener("input", updateColorPreviews);
borderColorInput.addEventListener("input", updateColorPreviews);

// Toggle custom message field visibility based on checkbox
function toggleCustomMessageVisibility() {
  customMessageInput.parentElement.style.display = showLifeTextToggle.checked
    ? "block"
    : "none";
}

// Set up toggle listener
showLifeTextToggle.addEventListener("change", toggleCustomMessageVisibility);

// Load saved settings when popup opens
chrome.storage.sync.get(
  [
    "hourlyWage",
    "showLifeText",
    "customMessage",
    "textColor",
    "bgColor",
    "borderColor",
  ],
  function (result) {
    if (result.hourlyWage) {
      wageInput.value = result.hourlyWage;
    }

    // Set toggle state, default to true if not saved before
    showLifeTextToggle.checked =
      result.showLifeText !== undefined ? result.showLifeText : true;

    // Set custom message, default to "of your life" if not saved before
    customMessageInput.value = result.customMessage || "of your life";

    // Set color values, use defaults if not yet saved
    textColorInput.value = result.textColor || "white";
    bgColorInput.value = result.bgColor || "black";
    borderColorInput.value = result.borderColor || "white";

    // Update the color previews
    updateColorPreviews();

    // Set initial visibility of custom message field
    toggleCustomMessageVisibility();
  }
);

// Save settings when button is clicked
saveButton.addEventListener("click", () => {
  const wageValue = parseFloat(wageInput.value);
  if (wageValue && wageValue > 0) {
    chrome.storage.sync.set(
      {
        hourlyWage: wageValue,
        showLifeText: showLifeTextToggle.checked,
        customMessage: customMessageInput.value,
        textColor: textColorInput.value,
        bgColor: bgColorInput.value,
        borderColor: borderColorInput.value,
      },
      () => {
        statusDiv.textContent = "Settings saved!";
        setTimeout(() => {
          statusDiv.textContent = "";
        }, 2000); // Clear status after 2s
        // Optional: Close popup after saving
        // window.close();
      }
    );
  } else {
    statusDiv.textContent = "Please enter a valid wage > 0.";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 3000);
  }
});
