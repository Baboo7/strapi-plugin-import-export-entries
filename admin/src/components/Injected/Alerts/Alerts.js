import './style.css';

import { Alert } from '@strapi/design-system/Alert';
import { Portal } from '@strapi/design-system/Portal';
import React from 'react';

import { useAlerts } from '../../../hooks/useAlerts';

export const Alerts = () => {
  const { alerts, removeAlert } = useAlerts();

  return (
    <Portal>
      <div className="plugin-ie-alerts">
        {alerts?.map(({ id, title, message, variant }) => (
          <Alert key={id} closeLabel="Close" title={title} variant={variant} onClose={() => removeAlert(id)}>
            {message}
          </Alert>
        ))}
      </div>
    </Portal>
  );
};
