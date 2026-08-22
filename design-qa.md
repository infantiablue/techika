**Comparison target**

- Source visual truth: `/Users/truong/.codex/generated_images/01a02a29-5098-7732-a4b0-e12c2e16b761/exec-45e858f6-c118-4e53-aaa1-a939976655b8.png` (1487 × 1058).
- Implementation: `.design-qa/home-desktop-light-final.png` and `.design-qa/home-desktop-dark-final.png` (1440px CSS viewport; desktop screenshot is 1425 × 1569 because it captures the full document), plus `.design-qa/home-mobile-light-final.png` (390px CSS viewport; 375 × 1737 capture).
- State: home page; light, dark, and mobile light. No density normalization was needed for the CSS-layout comparison.

**Findings**

- Earlier [P1] The mobile navigation control was visible at desktop widths, and the heading wrapped too narrowly. Fixed by restoring the desktop hide rule and widening the heading measure. Evidence: `.design-qa/home-light-refined.png` before the fix; final screenshots above.
- Earlier [P1] The fixed image could visually cross text. Fixed by placing it beneath a page-content layer; its remaining visibility is limited to the page edges and lower breathing room.
- No actionable P0/P1/P2 findings remain. Typography, spacing, palette, asset crop, and the real post content were reviewed against the source. The fixed image is intentionally subtler than the reference to preserve readable live content.

**Verification**

- Theme button was exercised through light, system, and dark; the dark-mode capture has `data-theme="dark"`.
- Mobile breakpoint shows a compact menu and single-column article rows.
- Browser console: no errors.
- Latest dark-mode evidence: `.design-qa/home-transparent-dark.png`. The main content surface is transparent, the dedicated dark mountain image remains low contrast behind text, and reduced-motion users receive the final static state.

**Follow-up Polish**

- P3: Replace the system serif with a licensed web font only if exact typographic matching becomes important.

final result: passed
