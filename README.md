# CodeArch Landing Page — Build-It-Yourself Lecture Pack (React.jsx + Vite)

This pack is **teaching-first**: each component file contains:

- a mini-lecture (mental models + best practices)
- a small, clean component skeleton you can expand

## How to use this pack

1) Create a Vite React app:
   - `npm create vite@latest codearch -- --template react`
2) Copy this pack’s `src/` into your project (merge/overwrite as needed)
3) Install + run:
   - `npm i`
   - `npm run dev`

## Guiding principle

> UI = (State × Props) → View
Aim for components that are mostly **pure rendering**. Put side effects in hooks only where needed.

## Suggested route

- Start with `src/pages/LandingPage.jsx` to see composition.
- Then implement: `NavBar` → `Hero` → `FeatureGrid` → `CTASection` → `Footer`.
