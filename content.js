let hourlyWage = null;
const processedMark = "lifeprice-processed"; // Mark elements we've already handled
const hoursSpanClass = "lifeprice-hours"; // Class for our added span

// --- Formatting Helper ---
function formatTimeCost(priceValue, wage) {
  if (wage <= 0) return ""; // Prevent division by zero or negative wage

  const timeInHours = priceValue / wage;

  if (timeInHours >= 1) {
    // Display in hours (e.g., 1.5 hrs)
    const hours = timeInHours.toFixed(1);
    const unit = hours === "1.0" ? "hr" : "hrs";
    return `${hours} ${unit}`;
  } else if (timeInHours >= 1 / 60) {
    // Display in minutes (e.g., 45 min)
    const minutes = Math.round(timeInHours * 60);
    const unit = minutes === 1 ? "min" : "mins";
    return `${minutes} ${unit}`;
  } else {
    // Display in seconds (e.g., 30 sec)
    const seconds = Math.round(timeInHours * 60 * 60);
    // Only show seconds if it's greater than 0, otherwise it looks weird (e.g., 0 sec)
    if (seconds <= 0) return "";
    const unit = seconds === 1 ? "sec" : "secs";
    return `${seconds} ${unit}`;
  }
}

// --- Generic Price Finding Logic (Revised: Insert-After Method) ---
const genericPriceRegex =
  /([\$£€])(\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?))/; // Keep regex simple for finding price

// Function specifically for updating time cost when text changes
function updateTimeCostForTextNode(textNode) {
  if (!hourlyWage || hourlyWage <= 0 || textNode.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const parentElement = textNode.parentElement;
  // Only proceed if the parent element EXISTS and WAS previously processed by us
  if (!parentElement || !parentElement.classList.contains(processedMark)) {
    return;
  }

  // Find the existing hours span (should be the next sibling element)
  const existingHoursSpan = parentElement.nextElementSibling;
  if (
    !existingHoursSpan ||
    !existingHoursSpan.classList.contains(hoursSpanClass)
  ) {
    // This shouldn't happen if the parent is marked, but good to check
    console.warn(
      "LifePrice (Update): Marked parent found, but no adjacent hoursSpan:",
      parentElement
    );
    // Optional: We could try to re-run calculateAndAppendHours_Generic here as a fallback
    // calculateAndAppendHours_Generic(textNode); // Be careful, might re-trigger loop if not handled well
    return;
  }

  // Now, re-evaluate the text node's current content
  const text = textNode.nodeValue;
  genericPriceRegex.lastIndex = 0; // Reset regex state
  const match = genericPriceRegex.exec(text);
  let timeText = ""; // Default to empty

  if (match) {
    const priceString = match[2].replace(/,/g, "");
    const priceValue = parseFloat(priceString);

    if (!isNaN(priceValue) && priceValue > 0) {
      const formattedTime = formatTimeCost(priceValue, hourlyWage);
      timeText = formattedTime ? ` (${formattedTime} of your life)` : "";
    }
  }

  // Update or remove the existing span
  if (timeText) {
    existingHoursSpan.textContent = timeText;
  } else {
    try {
      existingHoursSpan.remove();
      // Optional: We could remove the processedMark from the parent too,
      // but leaving it might be fine unless the element structure changes drastically.
      // parentElement.classList.remove(processedMark);
    } catch (e) {
      console.error(
        "LifePrice (Update): Error removing hoursSpan:",
        e,
        existingHoursSpan
      );
    }
  }
}

// --- Generic Price Finding Logic (Insert-After Method - Mostly Unchanged) ---
function calculateAndAppendHours_Generic(textNode) {
  if (!hourlyWage || hourlyWage <= 0 || textNode.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const parentElement = textNode.parentElement;
  if (!parentElement) return;

  // --- IMPORTANT CHANGE: Return early if already processed ---
  // Rely on the characterData observer + updateTimeCostForTextNode for updates.
  // This function should only handle the *initial* insertion.
  if (
    parentElement.classList.contains(processedMark) ||
    parentElement.nextElementSibling?.classList.contains(hoursSpanClass)
  ) {
    return;
  }
  // --- End of change ---

  // Avoid modifying text within script/style tags, or our own spans
  const parentTag = parentElement.tagName?.toUpperCase();
  if (
    parentTag === "SCRIPT" ||
    parentTag === "STYLE" ||
    parentElement.classList.contains(hoursSpanClass)
  ) {
    return;
  }

  const text = textNode.nodeValue;
  genericPriceRegex.lastIndex = 0; // Reset regex state
  const match = genericPriceRegex.exec(text); // Find the first price in the text node

  if (match) {
    const fullMatch = match[0]; // e.g., "$20 (14 mins of your life)"
    const priceString = match[2].replace(/,/g, "");
    const priceValue = parseFloat(priceString);

    if (!isNaN(priceValue) && priceValue > 0) {
      const formattedTime = formatTimeCost(priceValue, hourlyWage);
      const timeText = formattedTime ? ` (${formattedTime} of your life)` : "";

      if (timeText) {
        const hoursSpan = document.createElement("span");
        hoursSpan.textContent = timeText;
        hoursSpan.style.fontSize = "0.9em"; // Consistent styling
        hoursSpan.style.marginLeft = "5px";
        hoursSpan.style.color = "#555"; // Consistent styling
        hoursSpan.classList.add(hoursSpanClass); // Use specific class for time span

        try {
          // Insert the time span AFTER the parent element containing the text node
          parentElement.insertAdjacentElement("afterend", hoursSpan);
          parentElement.classList.add(processedMark); // Mark the PARENT element
        } catch (e) {
          console.error(
            "LifePrice (Generic Initial): Error inserting hoursSpan:",
            e,
            "after element:",
            parentElement
          );
        }
      }
    }
  }
}

function scanForPrices_Generic(targetNode) {
  const walker = document.createTreeWalker(
    targetNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        // Filter remains the same: find potential price text nodes whose parents
        // haven't been processed yet for initial insertion.
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const parentTag = parent.tagName?.toUpperCase();
        if (
          parentTag === "SCRIPT" ||
          parentTag === "STYLE" ||
          parent.classList.contains(hoursSpanClass) ||
          parent.closest(`.${hoursSpanClass}`)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        // Check if parent ALREADY marked or has span - if so, reject for initial scan
        if (
          parent.classList.contains(processedMark) ||
          parent.nextElementSibling?.classList.contains(hoursSpanClass)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        // Quick check for potential price symbols + digits
        if (node.nodeValue && /[$\£€]\s?\d/.test(node.nodeValue)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      },
    },
    false
  );

  const nodesToProcess = [];
  let node;
  while ((node = walker.nextNode())) {
    nodesToProcess.push(node);
  }
  nodesToProcess.forEach(calculateAndAppendHours_Generic); // Only does initial insertions now
}

// --- Amazon Specific Price Finding Logic ---
const amazonPriceExtractRegex =
  /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/;
const amazonPriceContainerSelector = "span.a-price"; // Target the container

function calculateAndAppendHours_Amazon(priceContainer) {
  if (!hourlyWage || hourlyWage <= 0) return;
  if (
    priceContainer.classList.contains(processedMark) ||
    priceContainer.nextElementSibling?.classList.contains(hoursSpanClass)
  ) {
    return;
  }

  const priceWholeEl = priceContainer.querySelector(".a-price-whole");
  const priceFractionEl = priceContainer.querySelector(".a-price-fraction");
  let priceValue = NaN;

  if (priceWholeEl && priceFractionEl) {
    const priceWholeText = priceWholeEl.textContent.trim().replace(/,/g, "");
    const priceFractionText = priceFractionEl.textContent.trim();
    const priceString = `${priceWholeText}.${priceFractionText}`;
    priceValue = parseFloat(priceString);
  } else {
    // Fallback: Try the .a-offscreen if parts aren't found (covers some edge cases)
    const offscreenEl = priceContainer.querySelector(".a-offscreen");
    if (offscreenEl) {
      const priceText = offscreenEl.textContent.trim();
      const match = priceText.match(amazonPriceExtractRegex);
      if (match && match[0]) {
        priceValue = parseFloat(match[0].replace(/,/g, ""));
      }
    }
  }

  if (!isNaN(priceValue) && priceValue > 0) {
    const formattedTime = formatTimeCost(priceValue, hourlyWage);
    const timeText = formattedTime ? ` (${formattedTime} of your life)` : "";

    if (timeText) {
      const hoursSpan = document.createElement("span");
      hoursSpan.textContent = timeText;
      hoursSpan.style.fontSize = "0.9em";
      hoursSpan.style.marginLeft = "5px";
      hoursSpan.style.color = "#555";
      hoursSpan.classList.add(hoursSpanClass); // Use specific class for time

      try {
        priceContainer.insertAdjacentElement("afterend", hoursSpan);
        priceContainer.classList.add(processedMark); // Mark the container
      } catch (e) {
        console.error(
          "LifePrice (Amazon): Error inserting hoursSpan:",
          e,
          "after element:",
          priceContainer
        );
      }
    }
  } else {
  }
}

function scanForPrices_Amazon(targetNode) {
  const scope =
    targetNode.nodeType === Node.ELEMENT_NODE ||
    targetNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE
      ? targetNode
      : document;
  try {
    const priceContainers = scope.querySelectorAll(
      amazonPriceContainerSelector
    );
    priceContainers.forEach(calculateAndAppendHours_Amazon);

    if (
      scope !== document &&
      typeof scope.matches === "function" &&
      scope.matches(amazonPriceContainerSelector)
    ) {
      calculateAndAppendHours_Amazon(scope);
    }
  } catch (e) {
    console.error(
      "LifePrice (Amazon): Error during querySelectorAll or processing:",
      e,
      "on targetNode:",
      targetNode
    );
  }
}

// --- Main Execution Logic ---
function runLifePrice() {
  const hostname = window.location.hostname;
  let scanFunction;
  let isAmazon = hostname.includes("amazon."); // Basic check

  if (isAmazon) {
    scanFunction = scanForPrices_Amazon;
  } else {
    scanFunction = scanForPrices_Generic;
  }

  // Initial scan
  scanFunction(document.body);

  // Observe changes - always use the chosen scan function for childList
  const observer = new MutationObserver((mutationsList) => {
    if (observer.isProcessing) return;
    observer.isProcessing = true;

    for (const mutation of mutationsList) {
      // Handle added nodes (for completely new sections/prices)
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.classList?.contains(hoursSpanClass)
          ) {
            return; // Skip our own spans
          }
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.closest(`.${processedMark}`)
          ) {
            return; // Skip nodes added inside already marked parents (handled by characterData)
          }

          if (
            node.nodeType === Node.ELEMENT_NODE ||
            node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
          ) {
            try {
              scanFunction(node); // Run initial scan logic on new nodes
            } catch (e) {
              console.error(
                "LifePrice: Error during observer scanFunction call:",
                e,
                "on node:",
                node
              );
            }
          }
        });
      }
      // Handle text changes within existing nodes (for price updates)
      else if (mutation.type === "characterData") {
        // Call the specific update function for the text node that changed
        if (!isAmazon && mutation.target.nodeType === Node.TEXT_NODE) {
          // Only apply to generic logic for now
          // Add a check to avoid processing changes within our own spans
          if (
            !mutation.target.parentElement?.classList.contains(hoursSpanClass)
          ) {
            updateTimeCostForTextNode(mutation.target);
          }
        }
      }
    }
    observer.isProcessing = false;
  });

  observer.isProcessing = false;

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true, // <-- Enable characterData observation
    characterDataOldValue: false, // We don't need the old value
  });
}

// --- Initialization ---

chrome.storage.sync.get(["hourlyWage"], function (result) {
  if (result.hourlyWage && result.hourlyWage > 0) {
    hourlyWage = result.hourlyWage;
    // Use a timeout to slightly delay execution, allowing page JS to settle
    setTimeout(runLifePrice, 500);
  } else {
    console.warn(
      "LifePrice: Hourly wage not set or invalid in storage. Value:",
      result.hourlyWage
    );
  }
});

// --- Storage Change Listener ---
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync" && changes.hourlyWage) {
    const newWage = changes.hourlyWage.newValue;
    if (newWage && newWage > 0) {
      hourlyWage = newWage;
      // Note: This doesn't automatically update existing prices on the page.
    } else {
      hourlyWage = null;
    }
  }
});
// --- End of content.js ---
