// lib/email/templates/BookingConfirmationEmail.tsx
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";
import { ESTABLISHMENT } from "@/lib/establishment";

export interface BookingConfirmationEmailProps {
  guestFirstName: string;
  roomName: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  status: "CONFIRMED" | "PENDING";
  precheckinUrl: string;
  bankIban?: string;
}

export function BookingConfirmationEmail({
  guestFirstName,
  roomName,
  checkInDate,
  checkOutDate,
  totalAmount,
  status,
  precheckinUrl,
  bankIban,
}: BookingConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {status === "CONFIRMED" ? "Tu reserva está confirmada" : "Hemos recibido tu solicitud de reserva"}
      </Preview>
      <Body style={{ fontFamily: "Georgia, serif", backgroundColor: "#fafaf9", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", border: "1px solid #e7e5e4" }}>
          <Heading style={{ fontSize: "20px", color: "#1c1917" }}>{ESTABLISHMENT.name}</Heading>
          <Text>Hola {guestFirstName},</Text>

          {status === "CONFIRMED" ? (
            <Text>
              Tu reserva está <strong>confirmada</strong>. Hemos guardado tu tarjeta como
              garantía; no se ha realizado ningún cargo todavía.
            </Text>
          ) : (
            <Text>
              Hemos registrado tu solicitud de reserva. Para confirmarla, realiza una
              transferencia bancaria por el importe indicado abajo
              {bankIban ? ` a la cuenta ${bankIban}` : ""}.
            </Text>
          )}

          <Hr />
          <Section>
            <Text>
              <strong>Alojamiento:</strong> {roomName}
            </Text>
            <Text>
              <strong>Check-in:</strong> {checkInDate}
            </Text>
            <Text>
              <strong>Check-out:</strong> {checkOutDate}
            </Text>
            <Text>
              <strong>Importe total:</strong> {totalAmount}
            </Text>
          </Section>
          <Hr />

          <Text>
            Antes de tu llegada, dedícanos un minuto para completar tus datos:{" "}
            <Link href={precheckinUrl}>{precheckinUrl}</Link>
          </Text>

          <Hr />
          <Text style={{ fontSize: "12px", color: "#78716c" }}>
            {ESTABLISHMENT.name}
            {ESTABLISHMENT.phone ? ` · ${ESTABLISHMENT.phone}` : ""}
            {ESTABLISHMENT.email ? ` · ${ESTABLISHMENT.email}` : ""}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default BookingConfirmationEmail;
