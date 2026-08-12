# GitHub Pages and Android CI Design

## Goal

Make the web application deploy as a compiled Vite site on GitHub Pages and make Android CI run Gradle from the actual Android project directory.

## Design

- Add a dedicated Pages workflow triggered by pushes to `main`. It installs locked Node dependencies, builds the Vite application, uploads `dist`, and deploys it with GitHub's official Pages actions.
- Use hash history for browser deployments. Electron already uses hash history; using the same routing mode on static hosting prevents direct navigation and refreshes from requesting nonexistent server paths.
- Give Android CI a job-level `android` working directory for shell commands. Artifact upload paths remain repository-relative because action inputs do not inherit shell `working-directory`.

## Verification

- A Node validation script asserts the workflows build from the correct directories, deploy `dist`, and configure hash routing.
- Run the full Vitest suite, production build, and Python unit tests.
