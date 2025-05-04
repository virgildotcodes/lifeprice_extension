console.log("LifePrice: Content script injected (v_assemble)."); // 1. Check if script loads

let hourlyWage = null;
const processedMark = "lifeprice-processed"; // Mark elements we've already handled
const hoursSpanClass = "lifeprice-hours"; // Class for our added span

// --- Price Finding Logic ---
// Selector for the main price container element
const priceContainerSelector = "span.a-price";

function calculateAndAppendHours(priceContainer) {
  // 6. Check if this function is called for found elements
  console.log(
    "LifePrice: calculateAndAppendHours called for container:",
    priceContainer
  );

  if (!hourlyWage || hourlyWage <= 0) {
    console.log("LifePrice: Skipping - hourlyWage is null/zero.");
    return;
  }

  // Check if this container or an adjacent hours span already exists
  if (
    priceContainer.classList.contains(processedMark) ||
    priceContainer.nextElementSibling?.classList.contains(hoursSpanClass)
  ) {
    // console.log("LifePrice: Skipping - already processed or hours span exists:", priceContainer); // Usually too noisy
    return;
  }

  // Find the whole and fractional parts within this container
  const priceWholeEl = priceContainer.querySelector(".a-price-whole");
  const priceFractionEl = priceContainer.querySelector(".a-price-fraction");

  if (priceWholeEl && priceFractionEl) {
    const priceWholeText = priceWholeEl.textContent.trim().replace(/,/g, ""); // Remove commas
    const priceFractionText = priceFractionEl.textContent.trim();

    // 7. Check the extracted parts
    console.log(
      `LifePrice: Found parts: whole="${priceWholeText}", fraction="${priceFractionText}"`
    );

    // Combine and parse
    const priceString = `${priceWholeText}.${priceFractionText}`;
    const priceValue = parseFloat(priceString);

    // 8. Check the parsed numeric value
    console.log(
      `LifePrice: Assembled priceString: "${priceString}", Parsed priceValue: ${priceValue}`
    );

    if (!isNaN(priceValue) && priceValue > 0) {
      const hours = (priceValue / hourlyWage).toFixed(1); // Calculate hours
      const hoursText = ` (${hours} hrs of life)`;
      // 9. Check calculated hours
      console.log(
        `LifePrice: Calculated hours: ${hours} for price ${priceValue}`
      );

      // Create a new span for the hours text
      const hoursSpan = document.createElement("span");
      hoursSpan.textContent = hoursText;
      hoursSpan.style.fontSize = "0.9em"; // Apply some styling
      hoursSpan.style.marginLeft = "5px";
      hoursSpan.style.color = "#555"; // Dark grey
      hoursSpan.classList.add(hoursSpanClass); // Add class for potential future targeting/styling

      // Insert the hours span *after* the main price container element
      try {
        priceContainer.insertAdjacentElement("afterend", hoursSpan);
        // 10. Check if insertion happened
        console.log("LifePrice: Inserted hoursSpan after:", priceContainer);
        // Mark the main container as processed
        priceContainer.classList.add(processedMark);
      } catch (e) {
        console.error(
          "LifePrice: Error inserting hoursSpan:",
          e,
          "after element:",
          priceContainer
        );
      }
    } else {
      console.log(
        `LifePrice: Skipping - Invalid parsed priceValue (${priceValue}) from parts.`
      );
    }
  } else {
    // Optional: Could add a fallback to check .a-offscreen here if parts aren't found
    // console.log(`LifePrice: Skipping - Could not find .a-price-whole or .a-price-fraction inside:`, priceContainer);
  }
}

// --- DOM Scanning and Observation ---
function scanForPrices(targetNode) {
  // 5. Check if scanForPrices is being called
  console.log("LifePrice: Scanning for price containers in:", targetNode);

  // Use querySelectorAll on the target node (or document) to find price elements
  const scope =
    targetNode.nodeType === Node.ELEMENT_NODE ||
    targetNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE
      ? targetNode
      : document;

  try {
    // Find elements matching the container selector within the scope
    const priceContainers = scope.querySelectorAll(priceContainerSelector);
    // 5b. Check if any elements are found by the selector
    console.log(
      `LifePrice: Found ${priceContainers.length} elements with selector '${priceContainerSelector}' in scope:`,
      scope
    );

    priceContainers.forEach(calculateAndAppendHours);

    // Also check if the targetNode itself matches (if it's an element being added)
    // This handles cases where the '.a-price' element itself is added dynamically
    if (
      scope !== document &&
      typeof scope.matches === "function" &&
      scope.matches(priceContainerSelector)
    ) {
      console.log(
        "LifePrice: Target node itself matches container selector:",
        scope
      );
      calculateAndAppendHours(scope);
    }
  } catch (e) {
    console.error(
      "LifePrice: Error during querySelectorAll or processing:",
      e,
      "on targetNode:",
      targetNode
    );
  }
}

// --- Initial run and Mutation Observer ---
function runLifePrice() {
  console.log("LifePrice: runLifePrice called (v_assemble)."); // 4. Check if main execution starts
  // Scan the initial document body
  scanForPrices(document.body);

  // Observe changes in the DOM
  const observer = new MutationObserver((mutationsList) => {
    // 11. Check if MutationObserver is firing
    // console.log(`LifePrice: MutationObserver detected ${mutationsList.length} mutations.`); // Can be very noisy
    let processedMutation = false;
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE ||
            node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
          ) {
            // Check if the added node *is* a price container OR *contains* price containers
            if (
              (typeof node.matches === "function" &&
                node.matches(priceContainerSelector)) ||
              (typeof node.querySelector === "function" &&
                node.querySelector(priceContainerSelector))
            ) {
              // 12. Check nodes being scanned by observer
              console.log(
                "LifePrice: Observer scanning node containing potential price:",
                node
              );
              scanForPrices(node);
              processedMutation = true;
            }
          }
        });
      }
    }
    // if (processedMutation) { console.log("LifePrice: Finished processing relevant mutations."); }
  });

  // Start observing the body for added nodes and subtree changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  console.log("LifePrice: MutationObserver started (v_assemble).");
}

// --- Initialization ---
console.log(
  "LifePrice: Attempting to get hourlyWage from storage (v_assemble)."
); // 2. Check storage access
chrome.storage.sync.get(["hourlyWage"], function (result) {
  console.log("LifePrice: Storage get callback. Result:", result); // 3. Check value retrieved
  if (result.hourlyWage && result.hourlyWage > 0) {
    hourlyWage = result.hourlyWage;
    console.log(`LifePrice: Hourly wage loaded: ${hourlyWage}`);
    // Adding a slight delay can sometimes help ensure the page's own JS has settled
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
    } else {
      hourlyWage = null;
      console.log("LifePrice: Storage changed. Wage removed or invalid.");
    }
  }
});

// --- End of content.js ---
