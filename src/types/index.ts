export type { EnumValues };

type EnumValues<T> = T[keyof T];
