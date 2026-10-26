import type {LibraryComponentMetadata} from '../../metadata/Definitions/metadata';
import TenantMediaPicker from './TenantMediaPicker';
import {groupedPresentationProperties, presentationValue} from './presentationPropertyModel.mjs';

type Properties = Record<string, unknown>;
type Definitions = LibraryComponentMetadata['propertyDefinitions'];

/** Editing tab: render declared text, layout and appearance defaults before any data binding exists. */
export default function ComponentPresentationProperties({
  definitions, properties, onChange
}: {
  definitions?: Definitions;
  properties: Properties;
  onChange: (next: Properties) => void;
}) {
  const groups = groupedPresentationProperties(definitions ?? []);
  const update = (key: string, value: unknown) => onChange({...properties, [key]: value});
  const clear = (key: string) => {
    const next = {...properties};
    delete next[key];
    onChange(next);
  };
  if (!groups.length) return null;
  return <div className="metadata-component-presentation" aria-label="Content and appearance settings">
    {groups.map(group => <details key={group.section} className="builder-advanced-panel"
      open={group.section === 'Content' ? true : undefined}>
      <summary className="properties-section-title">{group.section}</summary>
      {group.definitions.map(definition => {
        const key = definition.propertyKey;
        const value = presentationValue(properties, definition);
        const label = definition.label || key.replace(/([a-z])([A-Z])/g, '$1 $2');
        if (definition.kind === 'IMAGE') return <div key={key} className="form-label">
          <label>{label}</label>
          <TenantMediaPicker value={String(value ?? '')} onChange={next => update(key, next)} />
        </div>;
        if (definition.kind === 'SELECT' && definition.choices?.length) return <label key={key} className="form-label">
          {label}
          <select className="form-control" aria-label={label} value={String(value ?? '')}
            onChange={event => update(key, event.target.value)}>
            <option value="">Default / none</option>
            {definition.choices.map(choice =>
              <option key={choice.key} value={choice.key}>{choice.label}</option>)}
          </select>
        </label>;
        if (definition.kind === 'BOOLEAN') return <label key={key} className="checkbox-row">
          <input type="checkbox" checked={value === true}
            onChange={event => update(key, event.target.checked)}/>
          {label}
        </label>;
        if (definition.kind === 'NUMBER' || definition.kind === 'CURRENCY') return <label key={key} className="form-label">
          {label}
          <input className="form-control" aria-label={label} type="number"
            value={typeof value === 'number' ? value : ''}
            onChange={event => event.target.value === '' ? clear(key) : update(key, Number(event.target.value))}/>
        </label>;
        return <label key={key} className="form-label">
          {label}
          <input className="form-control" aria-label={label} type="text"
            value={String(value ?? '')} onChange={event => update(key, event.target.value)}/>
        </label>;
      })}
    </details>)}
  </div>;
}
