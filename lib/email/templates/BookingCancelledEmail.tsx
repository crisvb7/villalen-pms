// lib/email/templates/BookingCancelledEmail.tsx
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import { ESTABLISHMENT } from "@/lib/establishment";

export interface BookingCancelledEmailProps {
  guestFirstName: string;
  roomName: string;
  checkInDate: string;
  checkOutDate: string;
}

export function BookingCancelledEmail({
  guestFirstName,
  roomName,
  checkInDate,
  checkOutDate,
}: BookingCancelledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu reserva ha sido cancelada</Preview>
      <Body style={{ fontFamily: "Georgia, serif", backgroundColor: "#fafaf9", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", border: "1px solid #e7e5e4" }}>
          <Heading style={{ fontSize: "20px", color: "#1c1917" }}>{ESTABLISHMENT.name}</Heading>
          <Text>Hola {guestFirstName},</Text>
          <Text>Te confirmamos que tu reserva ha sido cancelada.</Text>
          <Hr />
          <Section>
            <Text>
              <strong>Alojamiento:</strong> {roomName}
            </Text>
            <Text>
              <strong>Fechas:</strong> {checkInDate} → {checkOutDate}
            </Text>
          </Section>
          <Hr />
          <Text>Si crees que esto es un error, contáctanos y lo revisamos.</Text>
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

export default BookingCancelledEmail;
