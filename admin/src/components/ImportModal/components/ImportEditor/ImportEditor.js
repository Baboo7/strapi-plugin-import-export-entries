import {
  Accordion,
  AccordionToggle,
  AccordionContent,
} from "@strapi/design-system/Accordion";
import { Box } from "@strapi/design-system/Box";
import { Select, Option } from "@strapi/design-system/Select";
import React, { useEffect, useState } from "react";

import ImportProxy from "../../../../api/importProxy";
import { Editor } from "../../../Editor/Editor";
import { useForm } from "../../../../hooks/useForm";

export const ImportEditor = ({
  data,
  dataFormat,
  slug,
  onDataChanged,
  onOptionsChanged,
}) => {
  const [attributeNames, setAttributeNames] = useState([]);
  const [showOptions, setShowOptions] = useState(false);

  const { options, getOption, setOption } = useForm({ idField: "id" });

  useEffect(() => {
    const fetchAttributeNames = async () => {
      const attributeNames = await ImportProxy.getModelAttributes({ slug });
      setAttributeNames(attributeNames);
    };
    fetchAttributeNames();
  }, []);

  useEffect(() => {
    onOptionsChanged(options);
  }, [options]);

  return (
    <>
      <Accordion
        expanded={showOptions}
        onToggle={() => setShowOptions((show) => !show)}
        size="S"
        variant="secondary"
      >
        <AccordionToggle title="Options" />
        <AccordionContent>
          <Box padding={4}>
            <Select
              label="Id Field"
              hint="Choose the field used as a unique identifier"
              onClear={() => setOption("idField", "id")}
              value={getOption("idField")}
              onChange={(value) => setOption("idField", value)}
            >
              {attributeNames.map((name) => (
                <Option key={name} value={name}>
                  {name}
                </Option>
              ))}
            </Select>
          </Box>
        </AccordionContent>
      </Accordion>
      <Editor content={data} language={dataFormat} onChange={onDataChanged} />
    </>
  );
};
