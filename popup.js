const wageInput = document.getElementById("wage");
const saveButton = document.getElementById("save");
const statusDiv = document.getElementById("status");

// Load saved wage when popup opens
chrome.storage.sync.get(["hourlyWage"], function (result) {
  if (result.hourlyWage) {
    wageInput.value = result.hourlyWage;
  }
});

// Save wage when button is clicked
saveButton.addEventListener("click", () => {
  const wageValue = parseFloat(wageInput.value);
  if (wageValue && wageValue > 0) {
    chrome.storage.sync.set({ hourlyWage: wageValue }, () => {
      statusDiv.textContent = "Wage saved!";
      setTimeout(() => {
        statusDiv.textContent = "";
      }, 2000); // Clear status after 2s
      // Optional: Close popup after saving
      // window.close();
    });
  } else {
    statusDiv.textContent = "Please enter a valid wage > 0.";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 3000);
  }
});
