import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import type { FieldMetadata } from '../../../../core/metadata/Definitions/metadata';
import {
  examineRecordFilter, isBooleanFilterField, isNumericFilterField, supportedFilterOperators
} from '../../../../core/records/RecordWorkspace/recordFilterMetadata';
import './RecordFilterEditor.css';

type Filter = {field: string; operator: string; value: unknown};
const isFilter = (item: unknown): item is Filter =>
  Boolean(item && typeof item === 'object' && !Array.isArray(item));
const isBlank = (operator: string) => operator === 'Is Blank' || operator === 'Is Not Blank';
const dateInputType = (field?: FieldMetadata): 'date'|'datetime-local'|'time'|'text' => {
  const type = (field?.dataType ?? '').replace(/^Formula\((.*)\)$/i, '$1');
  return /^(Date\/Time|DateTime)$/i.test(type) ? 'datetime-local'
    : /^Date$/i.test(type) ? 'date' : /^Time$/i.test(type) ? 'time' : 'text';
};
const isPicklist = (field?: FieldMetadata) =>
  /^(Picklist|Multi-Select Picklist|Multipicklist)$/i.test(field?.dataType ?? '');

/** Shared no-code filter editor: all types and choices come from accessible Field metadata. */
export default function RecordFilterEditor({
  title, fields, filters, onChange, logic = 'AND', onLogicChange
}: {
  title: string;
  fields: FieldMetadata[];
  filters: unknown[];
  onChange: (next: unknown[]) => void;
  logic?: 'AND'|'OR';
  onLogicChange?: (next: 'AND'|'OR') => void;
}) {
  const [fieldSearch, setFieldSearch] = useState('');
  const set = (index: number, patch: Partial<Filter>) =>
    onChange(filters.map((entry, i) => i === index ? { ...(isFilter(entry) ? entry : {}), ...patch } : entry));
  const remove = (index: number) => onChange(filters.filter((_, i) => i !== index));
  const add = (field = '') => {
    if (filters.length >= 20) return;
    onChange([...filters, { field, operator: 'Equals', value: '' }]);
    setFieldSearch('');
  };
  const query = fieldSearch.trim().toLocaleLowerCase();
  const matchingFields = query
    ? fields.filter(item => (item.label + ' ' + item.apiName).toLocaleLowerCase().includes(query)).slice(0, 20)
    : [];
  return <section className="metadata-record-filter-editor" aria-label={title + ' filter editor'}>
    <div className="metadata-filter-intro">
      <div><strong>{title}</strong><p>Select fields and conditions to limit the records shown by this data source.</p></div>
      <span className="metadata-filter-count">{filters.length}/20 conditions</span>
    </div>
    <div className="metadata-filter-toolbar">
      <label className="metadata-filter-search">
        <span>Find a field</span>
        <span className="metadata-filter-search-input"><Search size={16} aria-hidden="true"/>
          <input type="search" value={fieldSearch} placeholder="Search available fields"
            onChange={e => setFieldSearch(e.target.value)}/>
        </span>
      </label>
      <label className="metadata-filter-logic"><span>Match conditions</span>
        <select aria-label="Filter match logic" value={logic} disabled={!onLogicChange}
          onChange={e => onLogicChange?.(e.target.value === 'OR' ? 'OR' : 'AND')}>
          <option value="AND">All conditions (AND)</option>
          <option value="OR">Any condition (OR)</option>
        </select>
      </label>
    </div>
    {query && <div className="metadata-filter-search-results" role="region" aria-label="Matching fields">
      {matchingFields.length ? matchingFields.map(item => <button type="button" key={item.apiName}
        disabled={filters.length >= 20} onClick={() => add(item.apiName)}>
        <Plus size={15} aria-hidden="true"/> {item.label} <small>{item.apiName}</small>
      </button>) : <p>No matching accessible fields.</p>}
    </div>}
    <div className="metadata-filter-conditions">
      {filters.length === 0 && <p className="metadata-filter-empty">No conditions. All accessible records match until you add a filter.</p>}
      {filters.map((entry, index) => {
        const raw: Partial<Filter> = isFilter(entry) ? entry : {};
        const fieldName = typeof raw.field === 'string' ? raw.field : '';
        const field = fields.find(candidate => candidate.apiName === fieldName);
        const operator = typeof raw.operator === 'string' ? raw.operator : 'Equals';
        const dynamic = raw.value && typeof raw.value === 'object' && !Array.isArray(raw.value)
          ? raw.value as {source?: string; key?: string} : undefined;
        const source = dynamic?.source ?? 'Fixed';
        const value = dynamic ? '' : String(raw.value ?? '');
        const operators = supportedFilterOperators(field);
        const error = examineRecordFilter(entry, fields);
        const valueType = dateInputType(field);
        const valueControl = isBooleanFilterField(field)
          ? <select aria-label={title + ' value ' + (index + 1)} value={value}
              onChange={e => set(index, {value: e.target.value})}>
              <option value="">Choose value…</option>
              <option value="true">True</option><option value="false">False</option>
            </select>
          : isPicklist(field)
            ? <select aria-label={title + ' value ' + (index + 1)} value={value}
                onChange={e => set(index, {value: e.target.value})}>
                <option value="">Choose value…</option>
                {value && !field?.picklistValues?.includes(value) && <option value={value} disabled>Unavailable: {value}</option>}
                {field?.picklistValues?.map(choice => <option key={choice} value={choice}>{choice}</option>)}
              </select>
            : <input aria-label={title + ' value ' + (index + 1)}
                type={isNumericFilterField(field) ? 'number' : valueType}
                step={isNumericFilterField(field) ? 'any' : undefined}
                placeholder={field ? 'Enter a value' : 'Choose a field first'}
                disabled={!field} value={value} onChange={e => set(index, {value: e.target.value})}/>;
        return <div key={index} className="metadata-filter-condition" data-filter-index={index}>
          <div className="metadata-filter-condition-heading">
            <strong>Condition {index + 1}</strong>
            <button type="button" aria-label={'Remove condition ' + (index + 1)} onClick={() => remove(index)}>
              <Trash2 size={16} aria-hidden="true"/> Remove
            </button>
          </div>
          <div className="metadata-filter-condition-grid">
            <label><span>Field</span>
              <select aria-label={title + ' field ' + (index + 1)} value={fieldName}
                onChange={e => set(index, {field: e.target.value, operator: 'Equals', value: ''})}>
                <option value="">Choose field…</option>
                {fieldName && !field && <option value={fieldName} disabled>Missing: {fieldName}</option>}
                {fields.map(item => <option key={item.apiName} value={item.apiName}>{item.label}</option>)}
              </select>
            </label>
            <label><span>Operator</span>
              <select aria-label={title + ' operator ' + (index + 1)} value={operator}
                disabled={!field} onChange={e => set(index, {operator: e.target.value, value: ''})}>
                {!operators.includes(operator as typeof operators[number]) &&
                  <option value={operator} disabled>Unsupported: {operator}</option>}
                {operators.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            {!isBlank(operator) && <label><span>Value source</span>
              <select aria-label={title + ' value source ' + (index + 1)} value={source}
                disabled={!field} onChange={e => set(index, {value: e.target.value === 'Fixed' ? ''
                  : e.target.value === 'PageState' ? {source: 'PageState', key: ''}
                  : {source: e.target.value}})}>
                <option value="Fixed">Fixed value</option>
                <option value="PageState">Page state / Flow output</option>
                <option value="CurrentRecord">Current record ID</option>
                <option value="Session">Current session ID</option>
              </select>
            </label>}
            {!isBlank(operator) && (source === 'PageState'
              ? <label><span>Page state key</span>
                  <input aria-label={title + ' page state key ' + (index + 1)}
                    value={dynamic?.key ?? ''} placeholder="e.g. CurrentCartId"
                    onChange={e => set(index, {value: {source: 'PageState', key: e.target.value}})}/>
                </label>
              : source === 'Fixed' ? <label><span>Value</span>{valueControl}</label> : null)}
          </div>
          {error && <p role="alert" className="metadata-filter-error">{error}</p>}
        </div>;
      })}
    </div>
    <div className="metadata-filter-footer">
      <button type="button" className="metadata-filter-add" disabled={!fields.length || filters.length >= 20}
        onClick={() => add()}><Plus size={16} aria-hidden="true"/> Add condition</button>
      {!fields.length && <span>Select an Object with accessible fields first.</span>}
      {filters.length >= 20 && <span>Maximum 20 conditions per source.</span>}
    </div>
  </section>;
}
