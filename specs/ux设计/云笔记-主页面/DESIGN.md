# Design System Specification: The Fluid Intellect

This design system is a comprehensive framework for a high-end, web-based cloud note-taking experience. It moves beyond the "utility app" aesthetic into the realm of a "Digital Atelier"—a space that feels as tactile and intentional as a premium physical notebook, but powered by the ethereal intelligence of the cloud.

---

## 1. Overview & Creative North Star

### The Creative North Star: "The Digital Curator"
The system is built on the philosophy of **The Digital Curator**. Unlike standard note apps that feel like spreadsheets for text, this system treats information as a precious artifact. 

We break the "template" look through:
*   **Intentional Asymmetry:** Navigation and utility bars are offset to create a dynamic, editorial rhythm.
*   **Breathing Room:** Content is never "crammed." We use aggressive whitespace to reduce cognitive load.
*   **Tonal Depth:** We abandon the rigid 1px border. Depth is created through stacking shades of blue and white, mimicking the way light hits layered sheets of vellum.

---

## 2. Colors: The Fresh Blue Spectrum

The palette is rooted in a "Fresh Blue" foundation, moving from deep, authoritative navy to airy, translucent sky tones.

### Surface Hierarchy & The "No-Line" Rule
**Core Directive:** 1px solid borders are strictly prohibited for sectioning. 
Boundaries must be defined through background shifts. For example, a note list (using `surface-container-low`) should sit atop the main workspace (`surface`), creating a clear but soft distinction.

*   **Surface (`#f7f9fb`):** The primary canvas.
*   **Surface-Container-Lowest (`#ffffff`):** Reserved for active writing areas to provide maximum "pop."
*   **Surface-Container-Highest (`#dce4e8`):** Used for sidebar utilities or "sunken" search bars.

### The "Glass & Gradient" Rule
To elevate the UI from "web app" to "premium tool," floating elements (like AI assistant bubbles or voice recorders) must use **Glassmorphism**:
*   **Background:** `surface-variant` at 60% opacity.
*   **Effect:** `backdrop-filter: blur(20px)`.
*   **Signature Gradient:** Use a linear gradient from `primary` (#0256d2) to `primary-container` (#4880fd) for primary Action Buttons to provide a "lit from within" glow.

---

## 3. Typography: The Editorial Voice

We use a dual-font strategy to balance professional authority with modern readability.

*   **The Display Voice (Manrope):** Used for headlines and display scales. Its geometric nature feels modern and precise. 
    *   *Scale Example:* `display-lg` (3.5rem) for empty state welcomes; `headline-md` (1.75rem) for folder titles.
*   **The Content Voice (Inter):** Used for all body, titles, and labels. Inter provides exceptional legibility at small sizes and high-density text.
    *   *Scale Example:* `body-lg` (1rem) for the actual note-writing experience to ensure comfort.

**Editorial Tip:** Use high-contrast sizing. Don't be afraid to pair a `display-sm` folder title with a `label-sm` metadata tag right next to it. This "Big/Small" relationship is the hallmark of premium design.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are often "dirty." In this design system, we use light and tone to convey height.

*   **The Layering Principle:** 
    1.  Base: `surface`
    2.  Section: `surface-container-low`
    3.  Interactive Element: `surface-container-lowest`
*   **Ambient Shadows:** If an element must float (e.g., a context menu), use a "Blue-Tinted Shadow": 
    *   `box-shadow: 0 12px 32px -4px rgba(2, 86, 210, 0.08);`
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` (#acb3b7) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Refined Primitives

### Input Fields & Editor
*   **The Seamless Input:** Text inputs in the editor should have no background or border in their default state. They only reveal a `primary` focus ring or a subtle `surface-container` fill on hover.
*   **Error State:** Use `error` (#a83836) for text and a `error-container` (#fa746f) soft glow.

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `roundness-full` (capsule shape), `on-primary` text.
*   **Secondary:** No fill. `outline-variant` ghost border (20% opacity). On hover, transition to `secondary-container`.

### Cards & Lists (Notes/Folders)
*   **Prohibition:** No divider lines between notes in a list.
*   **Separation:** Use 12px of vertical white space and a subtle `surface-container-low` background on the "Active" note.
*   **Symbols:** Use modern, thin-stroke iconography (2pt weight) for:
    *   **Folders:** Open-ended stroke.
    *   **AI:** A four-point star (Sparkle) using `tertiary` (#615a84).
    *   **Voice:** A soft wave-form, never a literal microphone.

### Floating AI/Voice Bar
*   **Styling:** A centered, capsule-shaped bar at the bottom of the viewport.
*   **Material:** Glassmorphic (`surface` at 70% + blur).
*   **Depth:** Highest elevation shadow.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `tertiary` (#615a84) for "Intelligence" features (AI summaries, Voice-to-text). It signals a different "mode" of interaction.
*   **Do** use `roundness-xl` (1.5rem) for large containers and `roundness-md` (0.75rem) for smaller buttons. 
*   **Do** use "Negative Space" as a functional element to separate "Work" from "Navigation."

### Don't
*   **Don't** use pure black (#000000) for text. Use `on-surface` (#2c3437) to maintain the soft, blue-tinted professional feel.
*   **Don't** use 90-degree corners. Everything in this system has a minimum of `roundness-sm` to feel approachable.
*   **Don't** use standard "drop shadows." If it doesn't look like light passing through glass, it's too heavy.

---

## 7. Symbolism & Meaning
*   **Folder (`secondary`):** Storage, permanence, structure.
*   **Note (`primary`):** Action, creation, the present moment.
*   **AI/Voice (`tertiary`):** Magic, assistance, ethereal input. 

By adhering to these rules, designers will create a workspace that doesn't just store notes, but provides a serene, high-performance environment for the modern mind.