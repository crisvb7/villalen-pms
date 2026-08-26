// lib/establishment.ts
// Datos del establecimiento, usados en la ficha de viajero, facturas y facturas proforma.

export const ESTABLISHMENT = {
  name: process.env.HOTEL_NAME ?? "Casa de Aldea Villalén",
  cif: "09385117J",
  // El CIF de arriba es en realidad un NIF de persona física (autónomo) — el
  // Reglamento de facturación (RD 1619/2012, art. 6.1.b) exige el nombre y
  // apellidos del titular en la factura, el nombre comercial solo no basta.
  legalName: "Carlos Alfonso Villa Busto",
  address: "Lugar Villalén, 30, Cuerres",
  postalCode: "33568",
  municipality: "Ribadesella",
  province: "Asturias",
  autonomousCommunity: "Principado de Asturias",
  registrationNumber: "VUT-AS-XXXXX", // Número de registro turístico (completar)
  phone: process.env.HOTEL_PHONE ?? "",
  email: process.env.HOTEL_EMAIL ?? "",
  checkInTime: "15:00",
  checkOutTime: "12:00",
};
