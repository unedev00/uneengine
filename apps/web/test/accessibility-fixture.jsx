import React from 'react';
import { createRoot } from 'react-dom/client';
import OneButton from '../src/core/components/SharedRuntime/SharedButton.jsx';
import OneSearch from '../src/core/components/SharedRuntime/Search.jsx';
import '../src/core/workspace/WorkspaceTheme/design-system.css';
import '../src/component-libraries/shared/one.css';

window.React = React;

function AccessibilityFixture() {
  return <main className="one-ui" style={{display:'grid',gap:16,padding:24}}>
    <h1>Component accessibility fixture</h1>
    <OneSearch kind="Search" label="Contact search" showSuggestions={true} options={['Alice','Alex','Bob']} />
    <OneButton kind="Button" label="Save" loading={true} />
  </main>;
}

createRoot(document.getElementById('root')).render(<AccessibilityFixture />);
