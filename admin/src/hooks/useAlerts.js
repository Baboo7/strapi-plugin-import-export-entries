import { useRef, useState } from 'react';
import { singletonHook } from 'react-singleton-hook';

const init = { loading: true };

const useAlertsImpl = () => {
  const [alerts, setAlerts] = useState([]);
  const [idCount, setIdCount] = useState(0);
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const notify = (title, message, variant = 'default') => {
    const alert = {
      id: idCount,
      timeout: setTimeout(() => removeAlert(idCount), 8000),
      variant,
      title,
      message,
    };
    setAlerts(alerts.concat(alert));
    setIdCount(idCount + 1);
  };

  const removeAlert = (id) => {
    const alerts = alertsRef.current;
    const alert = alerts.find((a) => a.id === id);
    clearTimeout(alert.timeout);

    const alertsFiltered = alerts.filter((a) => a.id !== id);
    setAlerts(alertsFiltered);
  };

  return {
    alerts,
    notify,
    removeAlert,
  };
};

export const useAlerts = singletonHook(init, useAlertsImpl);
