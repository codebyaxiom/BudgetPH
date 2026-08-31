# User Workflow, Persistent Preferences & Session Hygiene Rules

## 1. Proactive Red-Teaming & Stress-Testing Loop
- When asked to test, fix loopholes, or verify capabilities:
  - **Loop autonomously** by running automated multi-scenario test suites.
  - Test all edge cases (Taglish phrasing, date transitions, partial numbers, read-only inquiries vs action triggers).
  - Do not stop until all edge cases are verified, resolved, and deployed.

## 2. Session Length & Context Hygiene (New Chat Advisory)
- **Anti-Hallucination Protocol:** Long conversations accumulate stale context that can lead to hallucinations or duplicate logic.
- **Rule:** Whenever a major milestone is completed, or when a session reaches significant length, **proactively suggest starting a fresh chat session**:
  > *"💡 **Proactive Tip**: We have successfully completed and deployed this feature! To ensure 100% token efficiency and eliminate any risk of AI hallucination, consider starting a new chat session for our next feature."*

## 3. Persistent User Preferences
- **Minimal Explanation / Maximum Architectural Proactivity:**
  - The user prefers to pitch high-level ideas while the assistant proactively architecting complete, robust solutions.
  - Never ask trivial questions or make the user re-explain established rules.
  - Propose the best recommended solution with clear rationale and execute upon approval.
- **Documentation & Second Brain Integrity:**
  - Always update project documentation and rule files so future sessions inherit all learned context automatically.
