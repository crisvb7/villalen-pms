-- Sustituye la integración con el Channel Manager Channex por Beds24.
-- Channex nunca llegó a configurarse en producción (sin CHANNEX_API_KEY /
-- CHANNEX_PROPERTY_ID no se activaba ninguna sincronización), así que no hay
-- datos reales que preservar en estas columnas.

-- RenameEnumValue: ningún canal externo llegó a guardar reservas con source
-- = 'CHANNEX' (columna nunca activa), así que renombrar el valor es seguro.
ALTER TYPE "BookingSource" RENAME VALUE 'CHANNEX' TO 'BEDS24';

-- RenameColumn: Beds24 solo necesita un "Room Id" por habitación (a
-- diferencia de Channex, que separaba room type y rate plan).
ALTER TABLE "rooms" RENAME COLUMN "channexRoomTypeId" TO "beds24RoomId";
ALTER TABLE "rooms" DROP COLUMN "channexRatePlanId";
