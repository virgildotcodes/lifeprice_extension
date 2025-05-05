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

// --- Generic Price Finding Logic (Revised: Insert-After Method) ---
const genericPriceRegex =
  /([\$£€])(\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?))/; // Keep regex simple for finding price

function calculateAndAppendHours_Generic(textNode) {
  if (!hourlyWage || hourlyWage <= 0 || textNode.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const parentElement = textNode.parentElement;
  if (!parentElement) return;

  // Check if the PARENT element is already processed or has a time span adjacent
  if (
    parentElement.classList.contains(processedMark) ||
    parentElement.nextElementSibling?.classList.contains(hoursSpanClass)
  ) {
    // console.log("LifePrice (Generic): Skipping - Parent already processed or has time span:", parentElement);
    return;
  }

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
        console.log(
          `LifePrice (Generic): Found price "${fullMatch}" in parent:`,
          parentElement,
          `Calculated time: ${timeText}`
        );

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
          console.log(
            "LifePrice (Generic): Inserted hoursSpan after:",
            parentElement
          );
        } catch (e) {
          console.error(
            "LifePrice (Generic): Error inserting hoursSpan:",
            e,
            "after element:",
            parentElement
          );
        }
        // Since we marked the parent, we don't need to worry about other text nodes inside it triggering this again.
      }
    }
  }
}

function scanForPrices_Generic(targetNode) {
  // console.log("LifePrice (Generic): Scanning text nodes in:", targetNode); // Less noisy logging
  const walker = document.createTreeWalker(
    targetNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        // Initial coarse filter: Parent exists, not in SCRIPT/STYLE, doesn't look like our own span's text
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const parentTag = parent.tagName?.toUpperCase();
        if (
          parentTag === "SCRIPT" ||
          parentTag === "STYLE" ||
          parent.classList.contains(hoursSpanClass) ||
          parent.classList.contains(processedMark) || // Don't walk children of already marked parents
          parent.closest(`.${hoursSpanClass}`) // Don't process text inside our spans
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        // Quick check for potential price symbols + digits
        if (node.nodeValue && /[$\£€]\s?\d/.test(node.nodeValue)) {
          // Further check: ensure parent isn't already marked or has span adjacent
          if (
            parent.classList.contains(processedMark) ||
            parent.nextElementSibling?.classList.contains(hoursSpanClass)
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT; // Skip nodes unlikely to contain prices
      },
    },
    false
  );

  const nodesToProcess = [];
  let node;
  while ((node = walker.nextNode())) {
    // The filter ensures we only get relevant text nodes whose parents aren't marked/styled
    nodesToProcess.push(node);
  }

  // console.log(`LifePrice (Generic): Found ${nodesToProcess.length} text nodes potentially containing prices.`); // Less noisy logging
  // Process nodes. The calculate function now handles marking the parent.
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
  console.log("LifePrice: Initial scan starting.");
  scanFunction(document.body);
  console.log("LifePrice: Initial scan finished.");

  // Observe changes - always use the chosen scan function
  const observer = new MutationObserver((mutationsList) => {
    // Use a flag to prevent re-entry if processing causes mutations synchronously
    if (observer.isProcessing) return;
    observer.isProcessing = true; // Set flag

    // console.log(`LifePrice: MutationObserver triggered (${mutationsList.length} mutations)`); // Debug log
    let processedMutation = false;
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          // Avoid scanning nodes added by our extension
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.classList?.contains(hoursSpanClass)
          ) {
            // console.log("LifePrice: Observer skipping added hoursSpan:", node);
            return;
          }
          // Also avoid scanning inside already processed containers if node is added there
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.closest(`.${processedMark}`)
          ) {
            // console.log("LifePrice: Observer skipping node added inside processedMark container:", node);
            return;
          }

          // Scan any added element node or fragment
          if (
            node.nodeType === Node.ELEMENT_NODE ||
            node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
          ) {
            // console.log("LifePrice: Observer scanning added node/fragment:", node); // Can be noisy
            try {
              scanFunction(node);
              processedMutation = true;
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
      // OPTIONAL: Handle characterData mutations if needed (e.g., price changes within an existing text node)
      // else if (mutation.type === 'characterData') {
      //     // Be VERY careful here, as this triggers often.
      //     // Check if the mutation target's parent is relevant and not processed.
      //     const targetNode = mutation.target;
      //     if (targetNode.nodeType === Node.TEXT_NODE) {
      //         // console.log("LifePrice: Observer processing characterData mutation:", targetNode);
      //         // Re-run the generic check on this specific text node's parent context
      //         // Ensure it's not inside our spans or already processed parents
      //         if (!targetNode.parentElement?.closest(`.${processedMark}, .${hoursSpanClass}`)) {
      //               genericPriceRegex.lastIndex = 0; // Reset regex
      //               if (genericPriceRegex.test(targetNode.nodeValue)) {
      //                   calculateAndAppendHours_Generic(targetNode); // Re-evaluate this specific node
      //                   processedMutation = true;
      //               }
      //         }
      //     }
      // }
    }
    // if (processedMutation) { console.log("LifePrice: Finished processing relevant mutations."); }

    // Clear the flag after processing this batch of mutations
    observer.isProcessing = false; // Reset flag
  });

  // Add the isProcessing property to the observer instance
  observer.isProcessing = false;

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    // characterData: true // OPTIONAL: Add if needed, but increases load significantly
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
