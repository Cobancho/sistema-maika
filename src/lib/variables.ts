export const dateFormat = "DD-MM-YYYY";

export const dateFormatting = {
  day: "DD-MM-YYYY",
  week: "W-MM-YYYY",
  month: "MM-YYYY",
  year: "YYYY",
};

export const colors = [
  {
    label: "Rojo",
    value: "red",
  },
  {
    label: "Verde",
    value: "green",
  },
  {
    label: "Naranja",
    value: "orange",
  },
  {
    label: "Azul",
    value: "primary",
  },
  {
    label: "Amarillo",
    value: "amber-400",
  },
  {
    label: "Violeta",
    value: "violet-500",
  },
  {
    label: "Rosa",
    value: "pink-500",
  },
  {
    label: "Celeste",
    value: "blue-400",
  },
];

export const currencies = [
  {
    value: "usd",
    label: "USD",
    strong: true,
  },
  {
    value: "usdt",
    label: "USDT",
    strong: true,
  },
  {
    value: "ars",
    label: "ARS",
    strong: false,
  },
  {
    value: "eur",
    label: "EUR",
    strong: true,
  },
  {
    value: "brl",
    label: "BRL",
    strong: true,
  },
];

export const currenciesOrder = ["ars", "usd", "usdt", "eur", "brl"];

export const paymentMethods = [
  {
    value: "cash",
    label: "Cash",
  },
  {
    value: "bank transfer",
    label: "Transferencia",
  },
];

export const operationTypes = [
  {
    value: "cambio",
    label: "Cambio",
  },
  {
    value: "cable",
    label: "Cable",
  },
  {
    value: "cuenta corriente",
    label: "Cuenta corriente",
  },
  {
    value: "pago por cta cte",
    label: "Pago por Cta Cte",
  },
  {
    value: "ingreso",
    label: "Ingreso",
  },
  {
    value: "fee",
    label: "Fee",
  },
  {
    value: "gasto",
    label: "Gasto",
  },
];

export const currentAccountOnlyTypes = ["fee", "cuenta corriente", "cable"];
export const cashAccountOnlyTypes = ["ingreso", "gasto"];

export const translations: Record<string, string> = {
  user: "usuario",
  client: "cliente",
  maika: "maika",
};
