// lib/establishment.ts
// Datos del establecimiento, usados en la ficha de viajero, facturas y presupuestos.

export const ESTABLISHMENT = {
  name: process.env.HOTEL_NAME ?? "Villalén",
  cif: "B-XXXXXXXX", // Completar con CIF real
  address: "Villalén, 1, Cuerres",
  municipality: "Ribadesella",
  province: "Asturias",
  autonomousCommunity: "Principado de Asturias",
  registrationNumber: "VUT-AS-XXXXX", // Número de registro turístico (completar)
  phone: process.env.HOTEL_PHONE ?? "",
  email: process.env.HOTEL_EMAIL ?? "",
};
