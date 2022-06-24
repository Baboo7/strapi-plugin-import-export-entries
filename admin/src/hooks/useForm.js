import { useState } from 'react';

export const useForm = (attributes) => {
  const [options, setOptions] = useState(attributes);

  const getOption = (key) => {
    return options[key];
  };

  const setOption = (key, value) => {
    setOptions({ ...options, [key]: value });
  };

  return { options, getOption, setOption };
};
