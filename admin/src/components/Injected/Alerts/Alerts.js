import { Alert } from "@strapi/design-system/Alert";
import { Button } from "@strapi/design-system/Button";
import { Portal } from "@strapi/design-system/Portal";
import Download from "@strapi/icons/Download";
import React from "react";
import { useIntl } from "react-intl";

import "./style.css";
import getTrad from "../../../utils/getTrad";
import { ExportModal } from "../../ExportModal";
import { useAlerts } from "../../../hooks/useAlerts";

export const Alerts = () => {
  const { alerts, removeAlert } = useAlerts();

  return (
    <Portal>
      <div className="plugin-ie-alerts">
        {alerts?.map(({ id, title, message, variant }) => (
          <Alert
            key={id}
            closeLabel="Close"
            title={title}
            variant={variant}
            onClose={() => removeAlert(id)}
          >
            {message}
          </Alert>
        ))}
      </div>
    </Portal>
  );
};
