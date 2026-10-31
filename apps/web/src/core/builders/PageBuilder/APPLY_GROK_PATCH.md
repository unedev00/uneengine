# Apply Grok canvas tools

## Quick apply (from repo root)

```bash
git fetch origin
git checkout feat/grok-ribbon-canvas-tools
git checkout origin/main -- apps/web/src/core/builders/PageBuilder/pageBuilderView.tsx
git apply apps/web/src/core/builders/PageBuilder/grok-canvas.patch
git add apps/web/src/core/builders/PageBuilder/pageBuilderView.tsx
git commit -m "feat(page-builder): apply Grok ribbon + PowerPoint-style nudge/group"
git push
```

Then refresh the PR — it will contain the real `pageBuilderView.tsx` change.
