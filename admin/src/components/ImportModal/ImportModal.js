import { Button } from "@strapi/design-system/Button";
import { Flex } from "@strapi/design-system/Flex";
import {
  ModalLayout,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from "@strapi/design-system/ModalLayout";
import { Portal } from "@strapi/design-system/Portal";
import { Typography } from "@strapi/design-system/Typography";
import IconFile from "@strapi/icons/File";
import React, { useState } from "react";

import "./style.css";
import ImportProxy from "../../api/importProxy";
import { useSlug } from "../../hooks/useSlug";
import { dataFormats } from "../../utils/dataConverter";
import { Editor } from "../Editor/Editor";
import { useAlerts } from "../../hooks/useAlerts";
import { useI18n } from "../../hooks/useI18n";

export const ImportModal = ({ onClose }) => {
  const { i18n } = useI18n();
  const { slug } = useSlug();
  const { notify } = useAlerts();

  const [data, setData] = useState("");
  const [dataFormat, setDataFormat] = useState(dataFormats.CSV);
  const [labelClassNames, setLabelClassNames] = useState(
    "plugin-ie-import_modal_input-label"
  );

  const onDataChanged = (data) => {
    setData(data);
  };

  const onReadFile = (e) => {
    const file = e.target.files[0];
    readFile(file);
  };

  const readFile = (file) => {
    if (file.type === "text/csv") {
      setDataFormat(dataFormats.CSV);
    } else if (file.type === "application/json") {
      setDataFormat(dataFormats.JSON);
    } else {
      throw new Error(`File type ${file.type} not supported.`);
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      setData(text);
    };
    reader.readAsText(file);
  };

  const removeFile = () => {
    setData("");
  };

  const uploadData = async () => {
    try {
      await ImportProxy.importData({ slug, data, format: dataFormat });
      notify(
        "Import successful",
        "Your data has been imported successfully. Refresh your page to see the latest updates.",
        "success"
      );
    } catch (err) {
      notify(
        "Import failed",
        "An error occured while importing your data",
        "danger"
      );
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLabelClassNames(
      [
        labelClassNames,
        "plugin-ie-import_modal_input-label--dragged-over",
      ].join(" ")
    );
  };

  const handleDragLeave = () => {
    setLabelClassNames(
      labelClassNames.replaceAll(
        "plugin-ie-import_modal_input-label--dragged-over",
        ""
      )
    );
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragLeave();
    const file = e.dataTransfer.files[0];
    readFile(file);
  };

  return (
    <Portal>
      <ModalLayout onClose={onClose} labelledBy="title">
        <ModalHeader>
          <Typography
            fontWeight="bold"
            textColor="neutral800"
            as="h2"
            id="title"
          >
            Import
          </Typography>
        </ModalHeader>
        <ModalBody className="plugin-ie-import_modal_body">
          {!data && (
            <Flex>
              <label
                className={labelClassNames}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <span style={{ fontSize: 80 }}>
                  <IconFile />
                </span>
                <Typography
                  style={{ fontSize: "1rem", fontWeight: 500 }}
                  textColor="neutral600"
                  as="p"
                >
                  Drag &amp; drop your file into this area or browse for a file
                  to upload
                </Typography>
                <input
                  type="file"
                  accept=".csv,.json"
                  hidden=""
                  onChange={onReadFile}
                />
              </label>
            </Flex>
          )}
          {data && (
            <Editor
              content={data}
              language={dataFormat}
              onChange={onDataChanged}
            />
          )}
        </ModalBody>
        <ModalFooter
          startActions={
            <>
              {data && (
                <Button onClick={removeFile} variant="tertiary">
                  {i18n("plugin.cta.remove-file")}
                </Button>
              )}
            </>
          }
          endActions={
            <>
              {data && (
                <Button onClick={uploadData}>
                  {i18n("plugin.cta.import")}
                </Button>
              )}
            </>
          }
        />
      </ModalLayout>
    </Portal>
  );
};
