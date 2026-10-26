/** Shared presentation variables. Profiles preserve the existing family defaults. */
export function componentAppearance(p, profile) {
  const layout = profile === 'layout';
  const length = (value, fallback) => {
    const parsed = Number(value ?? (layout ? 0 : fallback));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : (layout ? 0 : fallback);
  };
  const style = {
    // Inherit the single tenant/theme token unless the component explicitly overrides it.
    ...(p.accentColor ? {'--one-accent': p.accentColor} : {}),
    '--one-radius': length(p.radius, 16) + 'px',
    '--one-pad': length(p.padding, 16) + 'px',
    '--one-gap': length(p.gap, 12) + 'px'
  };
  if (profile !== 'actions') style['--one-blur'] = Math.min(20,
    layout ? Math.max(0, Number(p.glassBlur) || 0) : Math.max(0, Number(p.glassBlur ?? 8))) + 'px';
  const opacity = () => Math.max(0, Math.min(100, Number(p.opacity ?? 100))) / 100;
  if (!layout) style.width = p.width || '100%';
  if (profile === 'display') style.opacity = opacity();
  if (p.backgroundColor) style['--one-bg'] = p.backgroundColor;
  if (p.textColor) style['--one-fg'] = p.textColor;
  if (p.borderColor) style['--one-border'] = p.borderColor;
  if (layout) style.width = p.width || '100%';
  if (['layout', 'display', 'data'].includes(profile) && p.height && p.height !== 'auto') style.height = p.height;
  if (layout) style.opacity = opacity();
  if ((layout || profile === 'display') && p.shadow === 'none') style['--one-shadow'] = 'none';
  return {
    className: 'one-ui one-ui--' + (p.theme || 'glass') + ' one-ui--' +
      (p.size || 'medium') + (p.hideOnPhone ? ' one-hidden-mobile' : ''),
    style
  };
}
