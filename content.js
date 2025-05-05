console.log("LifePrice: Content script injected (v_hybrid_time_format).");

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

// --- Generic Price Finding Logic (Original Regex Method) ---
const genericPriceRegex =
  /([\$£€])(\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?))/g;

function calculateAndAppendHours_Generic(node) {
  if (!hourlyWage || hourlyWage <= 0 || node.nodeType !== Node.TEXT_NODE) {
    return;
  }
  // IMPORTANT: Check if the parent OR ANY ancestor has been processed by EITHER method
  if (node.parentElement?.closest(`.${processedMark}, .${hoursSpanClass}`)) {
    // console.log("LifePrice (Generic): Skipping already processed node or parent:", node);
    return;
  }
  // Avoid modifying text within script/style tags
  const parentTag = node.parentElement?.tagName?.toUpperCase();
  if (parentTag === "SCRIPT" || parentTag === "STYLE") {
    return;
  }

  const text = node.nodeValue;
  let match;
  let lastIndex = 0;
  const fragments = document.createDocumentFragment();
  let hasMatches = false;
  genericPriceRegex.lastIndex = 0; // Reset regex state

  while ((match = genericPriceRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const priceString = match[2].replace(/,/g, "");
    const priceValue = parseFloat(priceString);

    if (!isNaN(priceValue) && priceValue > 0) {
      const formattedTime = formatTimeCost(priceValue, hourlyWage);
      const timeText = formattedTime ? ` (${formattedTime} of your life)` : "";

      if (timeText) {
        hasMatches = true;
        fragments.appendChild(
          document.createTextNode(text.substring(lastIndex, match.index))
        );

        // Create a span to hold original price + time, and mark it
        const span = document.createElement("span");
        span.className = processedMark; // Mark it so we don't process it again
        span.appendChild(document.createTextNode(fullMatch)); // Original price text

        const timeNode = document.createTextNode(timeText);
        span.appendChild(timeNode);

        fragments.appendChild(span);
        lastIndex = genericPriceRegex.lastIndex;

        // Log success for generic method
        console.log(
          `LifePrice (Generic): Added "${timeText}" to "${fullMatch}" in node:`,
          node
        );
      }
    }
  }

  if (hasMatches) {
    fragments.appendChild(document.createTextNode(text.substring(lastIndex)));
    try {
      node.parentNode.replaceChild(fragments, node);
    } catch (e) {
      console.error("LifePrice (Generic): Error replacing text node:", e, node);
    }
  }
}

function scanForPrices_Generic(targetNode) {
  console.log("LifePrice (Generic): Scanning text nodes in:", targetNode);
  const walker = document.createTreeWalker(
    targetNode,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  const nodesToProcess = [];
  let node;
  while ((node = walker.nextNode())) {
    const parentTag = node.parentElement?.tagName?.toUpperCase();
    // Basic checks: avoid script/style, avoid already processed areas
    if (
      parentTag !== "SCRIPT" &&
      parentTag !== "STYLE" &&
      !node.parentElement?.closest(`.${processedMark}, .${hoursSpanClass}`)
    ) {
      // Additional check: Does the text likely contain a price pattern? Avoids processing huge chunks of text uselessly.
      genericPriceRegex.lastIndex = 0; // Reset regex before test
      if (genericPriceRegex.test(node.nodeValue)) {
        nodesToProcess.push(node);
      }
    }
  }
  console.log(
    `LifePrice (Generic): Found ${nodesToProcess.length} text nodes potentially containing prices.`
  );
  nodesToProcess.forEach(calculateAndAppendHours_Generic);
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
    console.log(
      `LifePrice (Amazon): Assembled price ${priceValue} from parts in:`,
      priceContainer
    );
  } else {
    // Fallback: Try the .a-offscreen if parts aren't found (covers some edge cases)
    const offscreenEl = priceContainer.querySelector(".a-offscreen");
    if (offscreenEl) {
      const priceText = offscreenEl.textContent.trim();
      const match = priceText.match(amazonPriceExtractRegex);
      if (match && match[0]) {
        priceValue = parseFloat(match[0].replace(/,/g, ""));
        console.log(
          `LifePrice (Amazon): Parsed price ${priceValue} from .a-offscreen in:`,
          priceContainer
        );
      }
    }
  }

  if (!isNaN(priceValue) && priceValue > 0) {
    const formattedTime = formatTimeCost(priceValue, hourlyWage);
    const timeText = formattedTime ? ` (${formattedTime} of your life)` : "";

    if (timeText) {
      console.log(
        `LifePrice (Amazon): Calculated time: ${timeText} for price ${priceValue}`
      );

      const hoursSpan = document.createElement("span");
      hoursSpan.textContent = timeText;
      hoursSpan.style.fontSize = "0.9em";
      hoursSpan.style.marginLeft = "5px";
      hoursSpan.style.color = "#555";
      hoursSpan.classList.add(hoursSpanClass); // Use specific class for time

      try {
        priceContainer.insertAdjacentElement("afterend", hoursSpan);
        console.log(
          "LifePrice (Amazon): Inserted hoursSpan after:",
          priceContainer
        );
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
    // console.log("LifePrice (Amazon): Skipping - No valid price found in container:", priceContainer);
  }
}

function scanForPrices_Amazon(targetNode) {
  console.log(
    "LifePrice (Amazon): Scanning for price containers in:",
    targetNode
  );
  const scope =
    targetNode.nodeType === Node.ELEMENT_NODE ||
    targetNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE
      ? targetNode
      : document;
  try {
    const priceContainers = scope.querySelectorAll(
      amazonPriceContainerSelector
    );
    console.log(
      `LifePrice (Amazon): Found ${priceContainers.length} elements with selector '${amazonPriceContainerSelector}' in scope:`,
      scope
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
    console.log("LifePrice: Running Amazon-specific logic for:", hostname);
    scanFunction = scanForPrices_Amazon;
  } else {
    console.log("LifePrice: Running generic logic for:", hostname);
    scanFunction = scanForPrices_Generic;
  }

  // Initial scan
  scanFunction(document.body);

  // Observe changes - always use the chosen scan function
  const observer = new MutationObserver((mutationsList) => {
    let processedMutation = false;
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          // Scan any added element node, letting the scan function decide what to look for
          if (node.nodeType === Node.ELEMENT_NODE) {
            // console.log("LifePrice: Observer scanning added node:", node); // Can be noisy
            scanFunction(node);
            processedMutation = true;
          }
          // Also handle fragments potentially containing relevant nodes
          else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            // console.log("LifePrice: Observer scanning added fragment:", node); // Can be noisy
            scanFunction(node);
            processedMutation = true;
          }
        });
      }
    }
    // if (processedMutation) { console.log("LifePrice: Finished processing relevant mutations."); }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  console.log("LifePrice: MutationObserver started.");
}

// --- Initialization ---
console.log(
  "LifePrice: Attempting to get hourlyWage from storage (v_hybrid_time_format)."
);
chrome.storage.sync.get(["hourlyWage"], function (result) {
  console.log("LifePrice: Storage get callback. Result:", result);
  if (result.hourlyWage && result.hourlyWage > 0) {
    hourlyWage = result.hourlyWage;
    console.log(
      `LifePrice: Hourly wage loaded: ${hourlyWage}. Starting runLifePrice.`
    );
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
      console.log(
        `LifePrice: Storage changed. New wage: ${hourlyWage}. Refresh page recommended.`
      );
      // Note: This doesn't automatically update existing prices on the page.
    } else {
      hourlyWage = null;
      console.log("LifePrice: Storage changed. Wage removed or invalid.");
    }
  }
});
// --- End of content.js ---
