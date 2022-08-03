import { Button } from '@strapi/design-system/Button';
import Upload from '@strapi/icons/Upload';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

import getTrad from '../../utils/getTrad';
import { ImportModal } from '../ImportModal';

export const InjectedImportButton = ({ fullWidth = false }) => {
  const { formatMessage } = useIntl();

  const [importVisible, setImportVisible] = useState(false);

  const openImportModal = () => {
    setImportVisible(true);
  };

  const closeImportModal = () => {
    setImportVisible(false);
  };

  return (
    <>
      <Button startIcon={<Upload />} onClick={openImportModal} fullWidth={fullWidth}>
        {formatMessage({ id: getTrad('plugin.cta.import') })}
      </Button>

      {importVisible && <ImportModal onClose={closeImportModal} />}
    </>
  );
};
