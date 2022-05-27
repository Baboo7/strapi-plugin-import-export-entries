import EditorLib from "@monaco-editor/react";
import React from "react";

import "./style.css";

export const Editor = ({
  content = "",
  language = "csv",
  readOnly = false,
  onChange,
  style,
}) => {
  return (
    <EditorLib
      className="plugin-ie-editor"
      style={style}
      height="30vh"
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
