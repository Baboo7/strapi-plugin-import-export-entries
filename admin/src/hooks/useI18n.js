import { useIntl } from "react-intl";

import getTrad from "../utils/getTrad";

export const useI18n = () => {
  const { formatMessage } = useIntl();

  const i18n = (key) => {
    return formatMessage({
      id: getTrad(key),
    });
  };

  return {
    i18n,
  };
};
