import { Button } from "@strapi/design-system/Button";
import { Checkbox } from "@strapi/design-system/Checkbox";
import {
  ModalLayout,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from "@strapi/design-system/ModalLayout";
import { Flex } from "@strapi/design-system/Flex";
import { Grid, GridItem } from "@strapi/design-system/Grid";
import { Loader } from "@strapi/design-system/Loader";
import { Portal } from "@strapi/design-system/Portal";
import { Select, Option } from "@strapi/design-system/Select";
import { Typography } from "@strapi/design-system/Typography";
import { pick } from "lodash";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import qs from "qs";

import "./style.css";
import ExportProxy from "../../api/exportProxy";
import { useDownloadFile } from "../../hooks/useDownloadFile";
import { useSlug } from "../../hooks/useSlug";
import { dataConverterConfigs, dataFormats } from "../../utils/dataConverter";
import { Editor } from "../Editor/Editor";
import { useAlerts } from "../../hooks/useAlerts";
import { useI18n } from "../../hooks/useI18n";

export const ExportModal = ({ onClose }) => {
  const { i18n } = useI18n();
  const { search } = useLocation();
  const { downloadFile, withTimestamp } = useDownloadFile();
  const { slug } = useSlug();
  const { notify } = useAlerts();

  const [optionApplyFilters, setOptionApplyFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState(dataFormats.CSV);
  const [data, setData] = useState(null);
  const [dataConverted, setDataConverted] = useState("");
  const [fetchingData, setFetchingData] = useState(false);

  useEffect(() => {
    convertData();
  }, [data, exportFormat]);

  const getData = async () => {
    const searchQry = qs.stringify(pick(qs.parse(search), ["filters", "sort"]));

    setFetchingData(true);
    const data = await getEntries(slug, searchQry);
    setData(data);
    setFetchingData(false);
  };

  const convertData = async () => {
    if (!data) {
      return;
    }

    const converter = dataConverterConfigs[exportFormat];
    if (!converter) {
      throw new Error(
        `File extension ${exportFormat} not supported to export data.`
      );
    }

    const { convertData } = converter;
    setDataConverted(convertData(data));
  };

  const writeDataToFile = async () => {
    const converter = dataConverterConfigs[exportFormat];
    if (!converter) {
      throw new Error(
        `File extension ${exportFormat} not supported to export data.`
      );
    }

    const { fileExt, fileContentType } = converter;
    const fileName = `export_${slug}.${fileExt}`
      .replaceAll(":", "-")
      .replaceAll("--", "-");
    downloadFile(
      dataConverted,
      withTimestamp(fileName),
      `${fileContentType};charset=utf-8;`
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(dataConverted);
    notify(
      "Copied to clipboard",
      "Your data has been copied to your clipboard successfully.",
      "success"
    );
  };

  const clearData = () => {
    setData(null);
  };

  const getEntries = async (slug, search) => {
    const data = await ExportProxy.getByContentType({
      slug,
      search,
      applySearch: optionApplyFilters,
    });
    return data.data;
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
            Export
          </Typography>
        </ModalHeader>
        <ModalBody className="plugin-ie-export_modal_body">
          {fetchingData && (
            <>
              <Flex justifyContent="center">
                <Loader>Fetching data...</Loader>
              </Flex>
            </>
          )}
          {!data && !fetchingData && (
            <>
              <Flex direction="column" alignItems="start" gap="16px">
                <Typography fontWeight="bold" textColor="neutral800" as="h2">
                  Options
                </Typography>
                <Checkbox
                  value={optionApplyFilters}
                  onValueChange={setOptionApplyFilters}
                >
                  Apply filters and sort to exported data.
                </Checkbox>
              </Flex>
            </>
          )}
          {data && !fetchingData && (
            <>
              <Grid gap={8}>
                <GridItem col={12}>
                  <Select
                    id="export-format"
                    label="Export Format"
                    required
                    placeholder="Export Format"
                    value={exportFormat}
                    onChange={setExportFormat}
                  >
                    <Option value={dataFormats.CSV}>
                      {dataFormats.CSV.toUpperCase()}
                    </Option>
                    <Option value={dataFormats.JSON}>
                      {dataFormats.JSON.toUpperCase()}
                    </Option>
                  </Select>
                </GridItem>
              </Grid>

              {!!data && (
                <Editor content={dataConverted} language={exportFormat} />
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter
          startActions={
            <>
              {!!data && (
                <Button variant="tertiary" onClick={clearData}>
                  {i18n("plugin.cta.back-to-options")}
                </Button>
              )}
            </>
          }
          endActions={
            <>
              {!data && (
                <Button onClick={getData}>{i18n("plugin.cta.get-data")}</Button>
              )}
              {!!data && (
                <>
                  <Button variant="secondary" onClick={copyToClipboard}>
                    {i18n("plugin.cta.copy-to-clipboard")}
                  </Button>
                  <Button onClick={writeDataToFile}>
                    {i18n("plugin.cta.download-file")}
                  </Button>
                </>
              )}
            </>
          }
        />
      </ModalLayout>
    </Portal>
  );
};
