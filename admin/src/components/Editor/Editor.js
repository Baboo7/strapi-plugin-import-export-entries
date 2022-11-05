import './style.css';

import EditorLib, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import React from 'react';

loader.config({ monaco });

export const Editor = ({ content = '', language = 'csv', readOnly = false, onChange, style }) => {
  return (
    <EditorLib
      className="plugin-ie-editor"
      style={style}
      height="40vh"
      theme="vs-dark"
      language={language}
      value={content}
      onChange={onChange}
      options={{
        readOnly,
        minimap: {
          enabled: false,
        },
        scrollBeyondLastLine: false,
      }}
    />
  );
};
