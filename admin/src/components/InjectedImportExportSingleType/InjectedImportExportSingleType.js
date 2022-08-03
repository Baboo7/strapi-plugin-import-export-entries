import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import { Typography } from '@strapi/design-system/Typography';
import React from 'react';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import getTrad from '../../utils/getTrad';
import { InjectedExportButton } from '../InjectedExportButton';
import { InjectedImportButton } from '../InjectedImportButton';

export const InjectedImportExportSingleType = () => {
  const { pathname } = useLocation();
  const { formatMessage } = useIntl();

  const isCollectionType = () => {
    return pathname.split('/')?.[2] === 'collectionType';
  };

  if (isCollectionType()) {
    return null;
  }

  return (
    <Box background="neutral0" hasRadius shadow="filterShadow" paddingTop={6} paddingBottom={4} paddingLeft={3} paddingRight={3}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({ id: getTrad('plugin.name') })}
      </Typography>
      <Box paddingTop={2} paddingBottom={6}>
        <Divider />
      </Box>

      <Box paddingBottom={1}></Box>
      <InjectedImportButton fullWidth />
      <Box paddingBottom={2}></Box>
      <InjectedExportButton fullWidth />
    </Box>
  );
};
