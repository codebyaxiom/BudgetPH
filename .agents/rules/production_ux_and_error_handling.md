# Production UX, Loading States, and Resilient Error Handling Rule

## 1. Zero Silent Failures (Mandatory)
* **Never fail silently:** An application or feature must NEVER catch an error and return to the previous state without informing the user.
* **Informative & Polite Dialogs:** Whenever an API call, calculation, or network operation fails:
  - Display a clear, friendly error dialog or banner explaining what happened.
  - Avoid cryptic raw stack traces in user-facing text; provide a human-friendly summary in the active language (English / Tagalog).
  - Include an immediate **[ 🔄 Try Again / Retry ]** button.
  - Include a **[ 🐛 Report Bug ]** action to let users report or copy error diagnostics.

## 2. Explicit & Engaging Loading States
* **No Unresponsive UI:** Every button or interactive trigger that starts an asynchronous process MUST immediately provide visual feedback:
  - Disable the trigger to prevent duplicate submissions.
  - Show a spinning loader, animated progress bar, or pulsing state.
  - Include reassuring progress copy (e.g., *"Calculating your budget... Please wait a moment"*, *"Saving your preferences..."*).
  - If a process takes more than 2 seconds, display an explicit message assuring the user that the system is still working.

## 3. State & Form Data Preservation
* When an error occurs during form submission or wizard setup:
  - **NEVER wipe out user inputs.**
  - Keep the user's filled-in values (names, amounts, dates) intact so they do not need to type everything again.
  - Allow the user to fix any invalid field and retry with a single click.

## 4. Multi-Language & Mobile Resilience
* All error messages, loading indicators, and retry options must respect the user's active display language (`en` / `tl`).
* Feedback modals and progress bars must be responsive and centered on mobile viewports (360px+).
