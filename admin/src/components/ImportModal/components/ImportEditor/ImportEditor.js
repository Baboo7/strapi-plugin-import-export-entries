import { Box } from '@strapi/design-system/Box';
import { Option, Select } from '@strapi/design-system/Select';
import { Tab, TabGroup, TabPanel, TabPanels, Tabs } from '@strapi/design-system/Tabs';
import { Typography } from '@strapi/design-system/Typography';
import React, { useEffect, useState } from 'react';

import ImportProxy from '../../../../api/importProxy';
import { useForm } from '../../../../hooks/useForm';
import { Editor } from '../../../Editor/Editor';

export const ImportEditor = ({ file, data, dataFormat, slug, onDataChanged, onOptionsChanged }) => {
  const [attributeNames, setAttributeNames] = useState([]);

  const { options, getOption, setOption } = useForm({ idField: 'id' });

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
      <TabGroup label="Import editor" variant="simple">
        <Tabs>
          <Tab>File</Tab>
          <Tab>Options</Tab>
        </Tabs>

        <TabPanels>
          <TabPanel>
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }} color="neutral800" paddingTop={4} paddingBottom={4} background="neutral0">
              <Box style={{ display: 'flex', gap: 8 }} paddingTop={2} paddingBottom={2}>
                <Typography fontWeight="bold" as="p">
                  File name :
                </Typography>
                <Typography as="p">{file?.name}</Typography>
              </Box>
              <Editor content={data} language={dataFormat} onChange={onDataChanged} />
            </Box>
          </TabPanel>
          <TabPanel>
            <Box color="neutral800" paddingTop={4} paddingBottom={4} background="neutral0">
              <Select
                label="Id Field"
                hint="Choose the field used as a unique identifier"
                onClear={() => setOption('idField', 'id')}
                value={getOption('idField')}
                onChange={(value) => setOption('idField', value)}
              >
                {attributeNames.map((name) => (
                  <Option key={name} value={name}>
                    {name}
                  </Option>
                ))}
              </Select>
            </Box>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </>
  );
};
