# IRIT-RTF ЦПП-2026 Design System for YaCamp Dashboard

This document contains the visual style rules and tokens extracted from the Figma project `ЦПП-2026` for use in the Yandex Camp Robotics Relay Dashboard.

## Design Tokens

### Colors (Theme: IRIT-RTF Light Mode)

```json
{
  "colors": {
    "background": {
      "canvas": "#F8F9FA",
      "panel": "#FFFFFF",
      "input": "#FFFFFF",
      "active": "#EBF3FA"
    },
    "border": {
      "default": "#E0E0E0",
      "active": "#013A72"
    },
    "text": {
      "primary": "#013A72",
      "secondary": "#888888",
      "placeholder": "#B0B0B0",
      "active": "#013A72"
    },
    "brand": {
      "deep-blue": "#013A72",
      "slate-grey": "#888888",
      "coral-red": "#F23C27",
      "pastel-blue": "#D2ECFD"
    },
    "alliances": {
      "alliance-a": {
        "primary": "#FF3B30",
        "glow": "rgba(255, 59, 48, 0.08)",
        "name": "Мега-Альянс А"
      },
      "alliance-b": {
        "primary": "#007AFF",
        "glow": "rgba(0, 122, 255, 0.08)",
        "name": "Мега-Альянс B"
      },
      "alliance-c": {
        "primary": "#FFCC00",
        "glow": "rgba(255, 204, 0, 0.08)",
        "name": "Мега-Альянс C"
      }
    }
  }
}
```

### Typography

- **Font Family**: `Mont`, `Inter`, -apple-system, sans-serif
- **Styling Rules**:
  - **All-lowercase**: Titles and buttons are written in lowercase (e.g. `заезд команды`, `сохранить результаты`) to create a friendly, student-focused tone.
  - **Underlines**: Underline text decoration is used for interactive links.

### Borders & Shapes

- **Corner Radius**:
  - **Pill style (`100px`)**: Strictly applied to all buttons, navigation tabs, and select fields.
  - **Card style (`12px`)**: Applied to content panels and tables.

---

## Brand Accents (Notebook Paper & Blobs)

- **Pastel Blobs**: Organic glowing background shapes in `#D2ECFD` representing digital technology mixed with friendly shapes.
- **Notebook Paper**: Horizontal thin lined rules (`#E0E0E0`) representing study, sketches, and student logs.
