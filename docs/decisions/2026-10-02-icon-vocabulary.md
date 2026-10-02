# Icon vocabulary

Date: 2026-10-02.

## Decision

Lucide is the only icon system in this product.

A graphical control uses a Lucide icon. It does not use a Unicode mark, an emoji, an icon font, or a second icon library. Text stays text. An em dash that means "not entered" is a fact, not an icon.

Icons name actions or destinations. They are not decoration. A primary action or destination keeps its words. An icon without a visible label needs an accessible name.

## Context

The phone interface had started to mix a plus sign, bare words for navigation, and platform controls. One restrained vocabulary keeps Tasks, Schedule, Capture, and week movement recognizable without making the screen louder.

## Consequences

- `lucide-react` is the dependency. Icons share one size and the library's stroke.
- Tasks uses `ListTodo`. Schedule uses `CalendarDays`. Capture uses `Plus`. Week movement uses `ChevronLeft` and `ChevronRight`. Changing the time zone uses `Pencil`.
- NOW does not get a navigation destination until it exists.
